"""Additional factored-up routines for which no clear pattern of organization
has yet emerged"""


from random import sample

from click import style
from more_itertools import pairwise
from numpy import array, histogram
from sklearn.preprocessing import minmax_scale
import torch
from torch.nn import Sequential, Linear, ReLU


def tensor(some_list):
    """Cast a list to a tensor of the proper type for our problem."""
    return torch.tensor(some_list, dtype=torch.float)


def tensors_from(pages, shuffle=False):
    """Return (inputs, correct outputs, number of tags that are recognition
    targets) tuple.

    Can also shuffle to improve training performance.

    """
    xs = []
    ys = []
    num_targets = 0
    maybe_shuffled_pages = sample(pages, len(pages)) if shuffle else pages
    for page in maybe_shuffled_pages:
        for tag in page['nodes']:
            xs.append(tag['features'])
            ys.append([1 if tag['isTarget'] else 0])  # Tried 0.1 and 0.9 instead. Was much worse.
            if tag['isTarget']:
                num_targets += 1
    return tensor(xs), tensor(ys), num_targets


def classifier(num_inputs, num_outputs, hidden_layer_sizes=[]):
    """Return a new model of the type Fathom uses.

    At present, this is a linear binary classifier modeled as a perceptron.

    :arg num_inputs: The number of input nodes (layer 0 of the net)
    :arg num_outputs: The number of outputs. So far, always 1 since it's a
        binary classifier. We may expand to multiclass someday, however.
    :arg hidden_layer_sizes: For each hidden layer, the number of nodes in it.
        Fully-connectedness is assumed.

    """
    sizes = [num_inputs] + hidden_layer_sizes

    layers = []
    for i, o in pairwise(sizes):
        layers.append(Linear(i, o, bias=True))
        layers.append(ReLU())  # Sigmoid does worse, Tanh about the same.
    layers.append(Linear(sizes[-1], num_outputs, bias=True))

    return Sequential(*layers)


def mini_histogram(data):
    """Return a histogram of a list of numbers with min and max numbers
    labeled."""
    chars = ' ▁▂▃▄▅▆▇█'
    data_array = array(data)
    counts, _ = histogram(data_array, bins=10)
    indices = minmax_scale(counts, feature_range=(0, 8)).round()
    chart = ''.join(chars[int(i)] for i in indices)
    return '{min} {chart} {max}'.format(min=data_array.min(),
                                        chart=style(chart, bg='white'),
                                        max=data_array.max())


def speed_readout(pages):
    """Return human-readable metrics on ruleset-running speed based on
    benchmarks taken by the Vectorizer."""
    average = sum(p['time'] for p in pages) / sum(len(p['nodes']) for p in pages)
    histogram = mini_histogram([p['time'] for p in pages])
    return f'\nTime per page (ms): {histogram}    Average per tag: {average:.1f}'
