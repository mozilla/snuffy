from json import load

from click import argument, command, File, option
from plotly.graph_objects import Histogram
from plotly.subplots import make_subplots


@command()
@argument('vector_file', type=File('r'))
@option('--feature_name', '-f',
        default='',
        help='The name of the feature to graph. Omit to graph all features.')
@option('--show_zeros', '-z',
        is_flag=True,
        default=False,
        help='Show zero counts in the graphs. These tend to be large and dominate the scale of the graph, making it harder to see other bars.')
def main(vector_file, feature_name, show_zeros):
    """Print a histogram of one or more features."""
    data = load(vector_file)
    feature_names = data['header']['featureNames']
    if feature_name:
        feature_index = feature_names.index(feature_name)
        vectors = [yes_and_no_vectors(data['pages'], feature_index, show_zeros)]
        feature_names = [feature_name]
    else:
        vectors = [yes_and_no_vectors(data['pages'], feature_index, show_zeros)
                   for feature_index in range(len(feature_names))]
    figure = histograms(vectors,
                        feature_names,
                        'Histograms of Feature Values' + ('' if show_zeros else
                                                          ', Zeros Omitted'))
    figure.show()


def histograms(vectors, feature_names, title):
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
                                   name='targets',
                                   **style),
                         row=row,
                         col=col)
        figure.add_trace(Histogram(x=no_vector,
                                   marker_color='red',
                                   name='non-targets',
                                   **style),
                         row=row,
                         col=col)
        col += 1
        if col > COLS:
            col = 1
            row += 1
    figure.update_layout(barmode='stack',
                         showlegend=False,
                         title_text=title)
    return figure


def yes_and_no_vectors(pages, feature_index, show_zeros):
    """For the specified feature, return a vector of feature values (across all
    pages) where the nodes are targets and another vector where the nodes are
    not targets."""
    yes_vector = []
    no_vector = []
    for page in pages:
        for node in page['nodes']:
            if show_zeros or node['features'][feature_index] != 0:
                vector = yes_vector if node['isTarget'] else no_vector
                vector.append(node['features'][feature_index])
    return yes_vector, no_vector
