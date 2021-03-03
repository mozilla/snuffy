from pathlib import Path
from pprint import pformat
import numpy as np

import click
from click import argument, BadOptionUsage, command, option, progressbar
from tensorboardX import SummaryWriter
from torch import tensor
from torch.nn import BCEWithLogitsLoss
from torch.optim import Adam

from ..accuracy import accuracy_per_tag, per_tag_metrics, pretty_accuracy, print_per_tag_report
from ..utils import classifier, path_or_none, speed_readout, tensors_from
from ..vectorizer import make_or_find_vectors


def learn(learning_rate, iterations, x, y, confidence_threshold, num_prunes, num_samples, positives, validation=None, stop_early=False, run_comment='', pos_weight=None, layers=[]):
    # Define a neural network using high-level modules.
    writer = SummaryWriter(comment=run_comment)
    model = classifier(len(x[0]), len(y[0]), layers)
    if pos_weight:
        pos_weight = tensor([pos_weight])
    loss_fn = BCEWithLogitsLoss(reduction='sum', pos_weight=pos_weight)  # reduction=mean converges slower.
    # TODO: Maybe also graph using add_pr_curve(), which can show how that tradeoff is going.
    optimizer = Adam(model.parameters(), lr=learning_rate)

    if validation:
        validation_ins, validation_outs = validation
        previous_validation_loss = None
    stopped_early = False
    with progressbar(range(iterations), label='Training') as bar:
        for t in bar:
            y_pred = model(x)  # Make predictions.
            loss = loss_fn(y_pred, y)
            # The loss function doesn't take num_prunes into account, but
            # that's okay; we're only trying to minimize it, not arrive at 0
            # precisely when accuracy is 1.
            writer.add_scalar('loss', loss, t)
            if validation:
                validation_loss = loss_fn(model(validation_ins), validation_outs)
                if stop_early:
                    if previous_validation_loss is not None and previous_validation_loss < validation_loss:
                        stopped_early = True
                        model.load_state_dict(previous_model)  # noqa: previous_model will always be defined here, but the linter can't follow the logic.
                        break
                    else:
                        previous_validation_loss = validation_loss
                        previous_model = model.state_dict()
                writer.add_scalar('validation_loss', validation_loss, t)
            accuracy, _, _ = accuracy_per_tag(y, y_pred, confidence_threshold, num_prunes)
            writer.add_scalar('training_accuracy_per_tag', accuracy, t)
            optimizer.zero_grad()  # Zero the gradients.
            loss.backward()  # Compute gradients.
            optimizer.step()
    if stopped_early:
        print(f'Stopping early at iteration {t}, just before validation error rose.')

    print('Successfully trained model, determining optimal threshold')
    optimal_thresholds = find_optimal_threshold(y, y_pred, num_prunes, num_samples, positives,
                                                confidence_threshold, threshold_incr=0.05)
    if confidence_threshold not in optimal_thresholds:
        print(f'Threshold: {confidence_threshold} is not an optimal threshold.  '
              f'Suggested threshold(s) are: {optimal_thresholds}')
    else:
        print(f'Threshold: {confidence_threshold} is an optimal threshold.')

    # Horizontal axis is what confidence. Vertical is how many samples were that confidence.
    writer.add_histogram('confidence', confidences(model, x), t)
    writer.close()
    return model


def find_optimal_threshold(y, y_pred, num_prunes, num_samples, positives, configured_threshold, threshold_incr=0.05):
    max_range = int(1.0 / threshold_incr) + 1
    min_distance = 1.4143
    optimal_thresholds = []

    for test_threshold in [round(x * threshold_incr, 2) for x in range(1, max_range)]:
        distance = calculate_precision_recall_distance(y, y_pred, test_threshold, num_prunes, num_samples, positives)

        if distance == min_distance:
            optimal_thresholds.append(test_threshold)
        if distance < min_distance:
            optimal_thresholds = [test_threshold]
            min_distance = distance

    return optimal_thresholds


def calculate_precision_recall_distance(y, y_pred, confidence_threshold, num_prunes, num_samples, positives):
    accuracy, false_positives, false_negatives = accuracy_per_tag(y, y_pred, confidence_threshold, num_prunes)

    target_precision_recall = np.array([1, 1])
    negatives = num_samples - positives
    true_positives = positives - false_negatives
    true_negatives = negatives - false_positives
    if not true_positives + false_positives:
        precision = 0
    else:
        precision = true_positives / (true_positives + false_positives)

    if not true_positives + false_negatives:
        recall = 0
    else:
        recall = true_positives / (true_positives + false_negatives)

    pr_distance = np.linalg.norm(np.array([precision, recall]) - target_precision_recall)
    return round(pr_distance, 4)


def confidences(model, x):
    return model(x).sigmoid()


def pretty_coeffs(model, feature_names):
    """Format coefficient and bias numbers for easy pasting into JS."""
    dict_params = {}
    for name, param in model.named_parameters():
        dict_params[name] = param.data.tolist()
    if '2.weight' in dict_params:  # There are hidden layers.
        return pformat(dict_params, compact=True)
    else:
        pretty = ',\n        '.join(f'["{k}", {v}]' for k, v in zip(feature_names, dict_params['0.weight'][0]))
        return ("""{{"coeffs": [
        {coeffs}
        ],
     "bias": {bias}}}""".format(coeffs=pretty, bias=dict_params['0.bias'][0]))


def exclude_indices(excluded_indices, list):
    """Remove the elements at the given indices from the list, and return
    it."""
    # I benched this, and del turns out to be over twice as fast as
    # concatenating a bunch of slices on a list of 32 items.
    vacuum = 0
    for i in excluded_indices:
        del list[i - vacuum]
        vacuum += 1
    return list


def exclude_features(exclude, vector_data):
    """Given a JSON-decoded vector file, remove any excluded features, and
    return the modified object."""
    feature_names = vector_data['header']['featureNames']
    excluded_indices = [feature_names.index(e) for e in exclude]
    exclude_indices(excluded_indices, feature_names)
    for page in vector_data['pages']:
        for tag in page['nodes']:
            if not tag.get('pruned'):
                exclude_indices(excluded_indices, tag['features'])
    return vector_data


@command()
@argument('training_set',
          type=click.Path(exists=True, resolve_path=True),
          metavar='TRAINING_SET_FOLDER')
@option('--ruleset', '-r',
        type=click.Path(exists=True, dir_okay=False, resolve_path=True),
        callback=path_or_none,
        help='The rulesets.js file containing your rules. The file must have no imports except from fathom-web, so pre-bundle if necessary.')
@option('--trainee',
        type=str,
        metavar='ID',
        help='The trainee ID of the ruleset you want to train. Usually, this is the same as the type you are training for.')
@option('--training-cache',
        type=click.Path(dir_okay=False, resolve_path=True),
        callback=path_or_none,
        help='Where to cache training vectors to speed future training runs. Any existing file will be overwritten. [default: vectors/training_yourTraineeId.json next to your ruleset]')
@option('--validation-cache',
        type=click.Path(dir_okay=False, resolve_path=True),
        callback=path_or_none,
        help='Where to cache validation vectors to speed future training runs. Any existing file will be overwritten. [default: vectors/validation_yourTraineeId.json next to your ruleset]')
@option('--delay',
        default=5,
        type=int,
        show_default=True,
        help='Number of seconds to wait for a page to load before vectorizing it')
@option('--tabs',
        default=16,
        type=int,
        show_default=True,
        help='Number of concurrent browser tabs to use while vectorizing')
@option('--show-browser',
        default=False,
        is_flag=True,
        help='Show browser window while vectorizing. (Browser runs in headless mode by default.)')
@option('--validation-set', '-a',
        type=click.Path(exists=True, resolve_path=True),
        callback=path_or_none,
        metavar='FOLDER',
        help="Either a folder of validation pages or a JSON file made manually by FathomFox's Vectorizer. Validation pages are used to avoid overfitting.")
@option('--stop-early/--no-early-stopping', '-s',
        default=True,
        show_default=True,
        help='Stop 1 iteration before validation loss begins to rise, to avoid overfitting. Before using this, check Tensorboard graphs to make sure validation loss is monotonically decreasing.')
@option('--learning-rate', '-l',
        default=1.0,
        show_default=True,
        help='The learning rate to start from')
@option('--iterations', '-i',
        default=1000,
        show_default=True,
        help='The number of training iterations to run through')
@option('--pos-weight', '-p',
        type=float,
        default=None,
        show_default=True,
        help='The weighting factor given to all positive samples by the loss function. Raise this to increase recall at the expense of precision. See: https://pytorch.org/docs/stable/nn.html#bcewithlogitsloss')
@option('--comment', '-c',
        default='',
        help='Additional comment to append to the Tensorboard run name, for display in the web UI')
@option('--quiet', '-q',
        default=False,
        is_flag=True,
        help='Hide per-tag diagnostics that may help with ruleset debugging.')
@option('--confidence-threshold', '-t',
        default=0.5,
        show_default=True,
        help='Threshold at which a sample is considered positive. Higher values decrease false positives and increase false negatives.')
@option('layers', '--layer', '-y',
        type=int,
        multiple=True,
        help='Add a hidden layer of the given size. You can specify more than one, and they will be connected in the given order. EXPERIMENTAL.')
@option('--exclude', '-x',
        type=str,
        multiple=True,
        help='Exclude a rule while training. This helps with before-and-after tests to see if a rule is effective.')
def train(training_set, validation_set, ruleset, trainee, training_cache, validation_cache, delay, tabs, show_browser, stop_early, learning_rate, iterations, pos_weight, comment, quiet, confidence_threshold, layers, exclude):
    """Compute optimal numerical parameters for a Fathom ruleset.

    The usual invocation is something like this::

        fathom train samples/training --validation-set samples/validation --ruleset rulesets.js --trainee new

    The first argument is a directory of labeled training pages. It can also
    be, for backward compatibility, a JSON file of vectors from FathomFox's
    Vectorizer.

    To see graphs of loss functions, install TensorBoard, then run
    ``tensorboard --logdir runs/``. These will tell you whether you need to
    adjust the ``--learning-rate``.

    Definitions of terms used in output:

    \b
    pruned
        Said of a node that was prematurely eliminated from consideration
        because it did not match the selector of any ``dom()`` call in the
        ruleset

    \b
    target
        A "right answer": a labeled, positive DOM node, one that should be
        recognized.

    """
    training_set = Path(training_set)

    # If they pass in a dir for either the training or validation sets, we need
    # a ruleset and a trainee for vectorizing:
    if (validation_set and validation_set.is_dir()) or training_set.is_dir():
        if not ruleset:
            raise BadOptionUsage('ruleset', 'A --ruleset file must be specified when TRAINING_SET_FOLDER or --validation-set are passed a directory.')
        if not trainee:
            raise BadOptionUsage('trainee', 'A --trainee ID must be specified when TRAINING_SET_FOLDER or --validation-set are passed a directory.')

    training_data = exclude_features(
        exclude,
        make_or_find_vectors(ruleset,
                             trainee,
                             training_set,
                             training_cache,
                             show_browser,
                             'training',
                             delay,
                             tabs))
    training_pages = training_data['pages']
    x, y, num_yes, num_prunes = tensors_from(training_pages, shuffle=True)
    num_samples = len(x) + num_prunes

    if validation_set:
        validation_pages = exclude_features(
            exclude,
            make_or_find_vectors(ruleset,
                                 trainee,
                                 validation_set,
                                 validation_cache,
                                 show_browser,
                                 'validation',
                                 delay,
                                 tabs))['pages']
        validation_ins, validation_outs, validation_yes, validation_prunes = tensors_from(validation_pages)
        validation_arg = validation_ins, validation_outs
    else:
        validation_arg = None

    layers = list(layers)  # Comes in as tuple
    full_comment = '.LR={l},i={i}{c}'.format(
        l=learning_rate,
        i=iterations,
        c=(',' + comment) if comment else '')
    model = learn(learning_rate,
                  iterations,
                  x,
                  y,
                  confidence_threshold,
                  num_prunes,
                  num_samples,
                  num_yes,
                  validation=validation_arg,
                  stop_early=stop_early,
                  run_comment=full_comment,
                  pos_weight=pos_weight,
                  layers=layers)

    print(pretty_coeffs(model, training_data['header']['featureNames']))
    accuracy, false_positives, false_negatives = accuracy_per_tag(y, model(x), confidence_threshold, num_prunes)
    print(pretty_accuracy('Training',
                          accuracy,
                          num_samples,
                          false_positives,
                          false_negatives,
                          num_yes))
    if validation_set:
        accuracy, false_positives, false_negatives = accuracy_per_tag(validation_outs, model(validation_ins), confidence_threshold, validation_prunes)
        print(pretty_accuracy('Validation',
                              accuracy,
                              len(validation_ins),
                              false_positives,
                              false_negatives,
                              validation_yes))

    # Print timing information:
    if training_pages and 'time' in training_pages[0]:
        if validation_set and validation_pages and 'time' in validation_pages[0]:
            print(speed_readout(training_pages + validation_pages))
        else:
            print(speed_readout(training_pages))

    if not quiet:
        print('\nTraining per-tag results:')
        print_per_tag_report([per_tag_metrics(page, model, confidence_threshold) for page in training_pages])
        if validation_set:
            print('\nValidation per-tag results:')
            print_per_tag_report([per_tag_metrics(page, model, confidence_threshold) for page in validation_pages])
