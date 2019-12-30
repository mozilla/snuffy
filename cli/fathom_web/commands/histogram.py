from json import load

from click import argument, command, File, option
from plotly.graph_objects import Histogram
from plotly.subplots import make_subplots

from ..utils import tensors_from


@command()
@argument('vector_file', type=File('r'))
@option('feature', '-f',
        type=str,
        default='',
        help='The name of the feature to graph. Omit to graph all features.')
def main(vector_file, feature):
    """Print a histogram of one or more features."""
    data = load(vector_file)
    x, y, num_yes = tensors_from(data['pages'])
    feature_names = data['header']['featureNames']
    if feature:
        feature_index = feature_names.index(feature)
        features = [values_for_feature(data['pages'], feature_index)]
    else:
        features = [values_for_feature(data['pages'], feature_index)
                    for feature_index in range(len(feature_names))]

    COLS = 4
    rows = len(features) // COLS + (1 if len(features) % COLS else 0)
    figure = make_subplots(
        rows=rows,
        cols=min(COLS, len(features)),
        subplot_titles=feature_names[:len(features)]
    )
    row = col = 1
    for f in features:
        figure.add_trace(Histogram(name=feature, x=f, nbinsx=40),
                         row=row,
                         col=col)
        col += 1
        if col > COLS:
            col = 1
            row += 1
    figure.show()


def values_for_feature(pages, feature_index):
    return [node['features'][feature_index]
            for page in pages
            for node in page['nodes']]
