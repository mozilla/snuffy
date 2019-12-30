from json import load

from click import argument, command, File, option, progressbar
from plotly.express import histogram
from plotly.subplots import make_subplots

from ..utils import classifier, tensor, tensors_from


@command()
@argument('vector_file', type=File('r'))
@argument('feature', type=str)
def main(vector_file, feature):
    """Print a histogram of the given feature."""
    data = load(vector_file)
    x, y, num_yes = tensors_from(data['pages'])

    feature_index = data['header']['featureNames'].index(feature)
    feature_values = []
    for page in data['pages']:
        for node in page['nodes']:
            feature_values.append(node['features'][feature_index])

    histogram({feature: feature_values}, x=feature, nbins=40).show()
