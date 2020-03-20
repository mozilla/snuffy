from ..utils import without_indices


def test_without_indices():
    assert without_indices([0, 2, 3], ['a', 'b', 'c', 'd', 'e', 'f']) == ['b', 'e', 'f']  # omit first, last, and some consecutive
    assert without_indices([1], ['a', 'b', 'c', 'd']) == ['a', 'c', 'd']  # leave ends alone
    assert without_indices([], ['a', 'b', 'c']) == ['a', 'b', 'c']  # do nothing
    assert without_indices([0], ['a']) == []  # omit everything
