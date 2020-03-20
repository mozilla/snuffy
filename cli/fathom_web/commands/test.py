from json import JSONDecodeError, load, loads

from click import argument, BadParameter, command, File

from ..accuracy import accuracy_per_tag, per_tag_metrics, pretty_accuracy, print_per_tag_report
from ..utils import classifier, speed_readout, tensor, tensors_from


def decode_weights(ctx, param, value):
    """Validate a click option, making sure it's a valid JSON object with
    properly formatted "coeff" and "bias" keys."""
    try:
        decoded_weights = loads(value)
    except JSONDecodeError:
        raise BadParameter('Weights must be a valid JSON object.')

    if 'coeffs' not in decoded_weights or 'bias' not in decoded_weights:
        raise BadParameter('Weights must contain "coeffs" and "bias" keys.')
    if not isinstance(decoded_weights['bias'], float):
        raise BadParameter('Bias must be a float.')
    if not (isinstance(decoded_weights['coeffs'], list) and
            all((len(pair) == 2 and
                 isinstance(pair[0], str) and
                 isinstance(pair[1], float))
                for pair in decoded_weights['coeffs'])):
        raise BadParameter('Coeffs must be a list of 2-element lists: [["ruleName", numericCoefficient], ...].')
    return decoded_weights


def model_from_json(weights, num_outputs, feature_names):
    """Return a linear model with the the passed in coeffs and biases.

    :arg weights: A dict with coeff and bias keys, as the program takes from
        the commandline
    :arg num_outputs: The number of output nodes of the network, typically 1
    :arg feature_names: The ordered list of feature names so we can get the
        coeffs lined up with the feature order used by the vectors

    """
    model = classifier(len(weights['coeffs']), num_outputs)
    coeffs = dict(weights['coeffs'])
    model.load_state_dict({'0.weight': tensor([[coeffs[f] for f in feature_names]]),
                           '0.bias': tensor([weights['bias']])})
    return model


@command()
@argument('testing_file',
          type=File('r'))
@argument('confidence-threshold',
          type=float)
@argument('weights', callback=decode_weights)
def main(testing_file, confidence_threshold, weights):
    """Compute the accuracy of the given coefficients and biases on a file of
    testing vectors.

    WEIGHTS should be a JSON-formatted object like this. You can paste it
    directly from the output of fathom-train.

        {"coeffs": [["nextAnchorIsJavaScript", 1.1627885103225708],
        ["nextButtonTypeSubmit", 4.613410949707031],
        ["nextInputTypeSubmit", 4.374269008636475]],

        "bias": -8.645608901977539}

    """
    testing_data = load(testing_file)
    testing_pages = testing_data['pages']
    x, y, num_yes = tensors_from(testing_pages)
    model = model_from_json(weights, len(y[0]), testing_data['header']['featureNames'])

    accuracy, false_positives, false_negatives = accuracy_per_tag(y, model(x), confidence_threshold)
    print(pretty_accuracy('\n   Testing accuracy per tag: ', accuracy, len(x), false_positives, false_negatives, num_yes))

    if testing_pages and 'time' in testing_pages[0]:
        print(speed_readout(testing_pages))

    print('\nTesting per-tag results:')
    print_per_tag_report([per_tag_metrics(page, model, confidence_threshold) for page in testing_pages])
