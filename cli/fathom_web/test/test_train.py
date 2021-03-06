import os
import operator

from click.testing import CliRunner

from ..commands.train import exclude_indices, train, find_optimal_cutoff, single_cutoff, possible_cutoffs, accuracy_per_tag
from ..utils import tensor


def test_exclude_indices():
    assert exclude_indices([0, 2, 3], ['a', 'b', 'c', 'd', 'e', 'f']) == ['b', 'e', 'f']  # omit first, last, and some consecutive
    assert exclude_indices([1], ['a', 'b', 'c', 'd']) == ['a', 'c', 'd']  # leave ends alone
    assert exclude_indices([], ['a', 'b', 'c']) == ['a', 'b', 'c']  # do nothing
    assert exclude_indices([0], ['a']) == []  # omit everything


def test_auto_vectorization_smoke(tmp_path):
    """Make sure we get through auto-vectorization of at least the training
    set."""
    test_dir = os.path.dirname(os.path.abspath(__file__))

    runner = CliRunner()
    result = runner.invoke(
        train,
        [
            f'{test_dir}/resources/train/',
            '--ruleset',
            f'{test_dir}/resources/train/vectorize_ruleset.js',
            '--trainee',
            'secret',
            '--training-cache',
            f'{tmp_path.as_posix()}/training_vectors.json',
        ]
    )
    assert result.exit_code == 0
    assert (tmp_path / 'training_vectors.json').exists()


def test_possible_cutoffs():
    # single cutoff
    y_pred = tensor([1.2512])
    expected = [0.78]
    possibles = possible_cutoffs(y_pred)
    assert possibles == expected

    # Reduces to single cutoff since the midpoint is used.
    y_pred = tensor([1.2512, 1.2516])
    expected = [0.78]
    possibles = possible_cutoffs(y_pred)
    assert possibles == expected

    # Reduces to a single cutoff (due to rounding) from 2 cutoffs (due to midpoint)
    y_pred = tensor([1.2512, 1.2516, 1.255])
    expected = [0.78]
    possibles = possible_cutoffs(y_pred)
    assert possibles == expected

    # Partial reduction in number of cutoffs
    y_pred = tensor([-2.1605, -0.5696, 0.4886, 0.8633, -1.3479,
                     -0.5813, -0.5696, 0.5696, -0.5950, -0.5696])
    expected = [0.15, 0.28, 0.36, 0.49, 0.63, 0.67]
    possibles = possible_cutoffs(y_pred)
    assert possibles == expected

    # No reduction in number of cutoffs (since midpoints are used, 3 cutoffs are calculated pre rounding).
    y_pred = tensor([-2, -2.25, -1.95, 1.251])
    expected = [0.11, 0.12, 0.45]
    possibles = possible_cutoffs(y_pred)
    assert possibles == expected


def test_find_optimal_cutoff_single_cutoff_with_highest_accuracy():
    # This test is doing the steps completed by find_optimal_cutoff separately to
    # determine the expected value.  The functions used are covered by other tests.
    y_pred = tensor([-2.1605, -0.5696, 0.4886, 0.8633, -1.3479, -0.5813, -0.5696, 0.5696, -0.5950, -0.5696])
    y = tensor([0., 0., 1., 1., 0., 0., 0., 1., 0., 0.])

    # Determining the expected_cutoff
    expected_cutoffs = determine_expected_cutoffs(y, y_pred)

    # Expecting a single cutoff for the best accuracy
    assert len(expected_cutoffs) == 1
    expected_cutoff = expected_cutoffs[0]

    # Now that we have the expected expected_cutoff check the value returned from
    # find_optimal_cutoff against it (this is the real test)
    optimal_cutoff = find_optimal_cutoff(y, y_pred, num_prunes=0)
    assert optimal_cutoff == expected_cutoff
    # and a final double check
    assert optimal_cutoff == 0.49


def test_find_optimal_cutoff_multiple_cutoffs_with_highest_accuracy():
    # This test is doing the steps completed by find_optimal_cutoff separately to
    # determine the expected value.  The functions used are covered by other tests.
    y_pred = tensor([-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.25, 2, 2.5])
    y = tensor([0., 1., 0., 1., 0., 1., 0., 1., 0., 1.])

    # Determining the expected_cutoff
    expected_cutoffs = determine_expected_cutoffs(y, y_pred)

    # Verifying that there are more than 1 cutoff with the best accuracy (the basis for this test case)
    assert len(expected_cutoffs) > 1

    # From the list of best cutoffs get the single value (single_cutoff is tested elsewhere)
    expected_cutoff = single_cutoff(expected_cutoffs)

    # Now that we have the expected cutoff check the value returned from
    # find_optimal_cutoff against it (this is the real test)
    optimal_cutoff = find_optimal_cutoff(y, y_pred, num_prunes=0)
    assert optimal_cutoff == expected_cutoff
    # and a final double check
    assert optimal_cutoff == 0.56


def test_single_cutoff():
    # single
    cutoffs = [0]
    assert single_cutoff(cutoffs) == 0

    # last element
    cutoffs = [0, 1]
    assert single_cutoff(cutoffs) == 1

    cutoffs = [0, 1, 10]
    assert single_cutoff(cutoffs) == 10

    # middle element
    cutoffs = [0, 1, 2]
    assert single_cutoff(cutoffs) == 1

    cutoffs = [0, 1, 2, 3]
    assert single_cutoff(cutoffs) == 2

    cutoffs = [0, 1, 2, 3, 4]
    assert single_cutoff(cutoffs) == 2

    cutoffs = [0, 1, 2, 3, 4, 5]
    assert single_cutoff(cutoffs) == 3


def determine_expected_cutoffs(y, y_pred):
    # This list will contain the optimal cutoff
    possibles = possible_cutoffs(y_pred)

    # Get the accuracy for each possible cutoff
    # Note this is a different method of tracking the best cutoff than in find_optimal_cutoff.
    cutoff_accuracy = {}
    for possible in possibles:
        accuracy, _, _ = accuracy_per_tag(y, y_pred, possible, num_prunes=0)
        cutoff_accuracy[possible] = accuracy

    # Get the cutoffs with the max accuracy, there could be more than 1 cutoff
    max_accuracy = max(cutoff_accuracy.items(), key=operator.itemgetter(1))[1]
    optimal_cutoffs = [cutoff for cutoff, accuracy in cutoff_accuracy.items() if max_accuracy == accuracy]

    return optimal_cutoffs