import os

from click.testing import CliRunner

from ..commands.train import exclude_indices, train, calculate_precision_recall_distance, find_optimal_threshold
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


def test_calculate_precision_recall_distance_0():
    y_pred = tensor([-2.1605, -0.5696, 0.3886, 0.8633, -1.3479, -0.1813, -0.5696, 0.5696, -0.0950, -0.5696])
    y = tensor([0., 0., 1., 1., 0., 0., 0., 1., 0., 0.])
    confidence_threshold = 0.5
    num_prunes = 0
    num_samples = 10
    positives = 3
    distance = calculate_precision_recall_distance(y, y_pred, confidence_threshold, num_prunes, num_samples, positives)
    assert distance == 0


def test_calculate_precision_recall_distance_non_zero_fp():
    y_pred = tensor([-2.1605, -0.5696, 0.3886, 0.8633, -1.3479, -0.1813, -0.5696, 0.5696, -0.0950, -0.5696])
    y = tensor([0., 0., 1., 1., 0., 0., 0., 1., 0., 0.])
    confidence_threshold = 0.25
    num_prunes = 0
    num_samples = 10
    positives = 3
    distance = calculate_precision_recall_distance(y, y_pred, confidence_threshold, num_prunes, num_samples, positives)
    assert distance == 0.625


def test_calculate_precision_recall_distance_non_zero_fn():
    y_pred = tensor([-2.1605, -0.5696, 0.3886, 0.8633, -1.3479, -0.1813, -0.5696, 1.5696, -0.0950, -0.5696])
    y = tensor([0., 0., 1., 1., 0., 0., 0., 1., 0., 0.])
    confidence_threshold = 0.75
    num_prunes = 0
    num_samples = 10
    positives = 3
    distance = calculate_precision_recall_distance(y, y_pred, confidence_threshold, num_prunes, num_samples, positives)
    assert distance == 0.6667


def test_find_optimal_threshold():
    y_pred = tensor([-2.1605, -0.5696, 0.4886, 0.8633, -1.3479, -0.5813, -0.5696, 0.5696, -0.5950, -0.5696])
    y_pred_confidence = y_pred.sigmoid().numpy().flatten()
    # [0.1033541  0.3613291  0.5959456  0.70334965 0.20621389 0.45479873, 0.3613291  0.63867086 0.4762678  0.3613291 ]
    y = tensor([0., 0., 1., 1., 0., 0., 0., 1., 0., 0.])

    optimal_thresholds = find_optimal_threshold(y, y_pred, num_prunes=0, num_samples=10, positives=3, configured_threshold=0.5, threshold_incr=0.1)
    assert len(optimal_thresholds) == 3
    assert 0.1 not in optimal_thresholds
    assert 0.2 not in optimal_thresholds
    assert 0.3 not in optimal_thresholds
    assert 0.4 in optimal_thresholds
    assert 0.5 in optimal_thresholds
    assert 0.6 in optimal_thresholds
    assert 0.7 not in optimal_thresholds
    assert 0.8 not in optimal_thresholds
    assert 0.9 not in optimal_thresholds
    assert 1.0 not in optimal_thresholds
