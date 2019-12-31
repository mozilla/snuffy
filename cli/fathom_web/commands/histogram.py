from json import load

from click import argument, command, File, option
from plotly.graph_objects import Histogram
from plotly.subplots import make_subplots


@command()
@argument('vector_file', type=File('r'))
@option('feature', '-f',
        type=str,
        default='',
        help='The name of the feature to graph. Omit to graph all features.')
def main(vector_file, feature):
    """Print a histogram of one or more features."""
    data = load(vector_file)
    feature_names = data['header']['featureNames']
    if feature:
        feature_index = feature_names.index(feature)
        vectors = [yes_and_no_vectors(data['pages'], feature_index)]
        feature_names = [feature_names[feature_index]]
    else:
        vectors = [yes_and_no_vectors(data['pages'], feature_index)
                   for feature_index in range(len(feature_names))]
    figure = histograms(vectors, feature_names)
    figure.show()


def histograms(vectors, feature_names):
    """Return a figure containing a histogram for each feature."""
    COLS = 4
    rows = len(vectors) // COLS + (1 if len(vectors) % COLS else 0)
    figure = make_subplots(
        rows=rows,
        cols=min(COLS, len(vectors)),
        subplot_titles=feature_names
    )
    row = col = 1
    for yes_vector, no_vector in vectors:
        style = dict(nbinsx=100)
        figure.add_trace(Histogram(x=yes_vector,
                                   marker_color='green',
                                   **style),
                         row=row,
                         col=col)
        figure.add_trace(Histogram(x=no_vector,
                                   marker_color='red',
                                   **style),
                         row=row,
                         col=col)
        col += 1
        if col > COLS:
            col = 1
            row += 1
    figure.update_layout(barmode='stack',
                         showlegend=False,
                         title_text='Histograms of Feature Values')
    return figure


def yes_and_no_vectors(pages, feature_index):
    """For the specified feature, return a vector of feature values (across all
    pages) where the nodes are targets and another vector where the nodes are
    not targets."""
    yes_vector = []
    no_vector = []
    for page in pages:
        for node in page['nodes']:
#            if node['features'][feature_index] != 0:
            vector = yes_vector if node['isTarget'] else no_vector
            vector.append(node['features'][feature_index])
    return yes_vector, no_vector
