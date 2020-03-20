from ..commands.train import exclude_indices


def test_exclude_indices():
    assert exclude_indices([0, 2, 3], ['a', 'b', 'c', 'd', 'e', 'f']) == ['b', 'e', 'f']  # omit first, last, and some consecutive
    assert exclude_indices([1], ['a', 'b', 'c', 'd']) == ['a', 'c', 'd']  # leave ends alone
    assert exclude_indices([], ['a', 'b', 'c']) == ['a', 'b', 'c']  # do nothing
    assert exclude_indices([0], ['a']) == []  # omit everything
