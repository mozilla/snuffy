from click.testing import CliRunner

from ..commands.list import main as list_main


def test_end_to_end(tmp_path):
    """Test expected outcome when using all of the optional parameters"""
    # Make temporary in_directory and base_dir directories
    base_dir, in_directory = make_directories(tmp_path)

    # Make HTML files in in_directory in two separate subdirectories
    # so we can exercise the recursive option.
    a1, a2, b1, b2 = make_html_files(in_directory)

    # Make the out_file we will save the output to
    out_file = (base_dir / 'out_file.txt')

    # Run fathom-list
    result = CliRunner().invoke(
        list_main,
        [
            in_directory.as_posix(),
            f'-b{base_dir.as_posix()}',
            '-r',
            f'-o{out_file.as_posix()}',
        ],
    )
    assert result.exit_code == 0

    expected_file_contents = [
        a1.relative_to(base_dir).as_posix(),
        a2.relative_to(base_dir).as_posix(),
        b1.relative_to(base_dir).as_posix(),
        b2.relative_to(base_dir).as_posix(),
    ]
    actual_file_contents = out_file.read_text().splitlines()
    assert expected_file_contents == actual_file_contents


def make_directories(tmp_path):
    """Makes the directories used as base_dir and in_directory in our fathom-list calls"""
    base_dir = tmp_path / 'base_dir'
    base_dir.mkdir()
    in_directory = base_dir / 'in_directory'
    in_directory.mkdir()
    return base_dir, in_directory


def make_html_files(in_directory):
    """Makes four HTML files in a common directory structure for using in our fathom-list calls"""
    (in_directory / 'source_a').mkdir()
    a1 = (in_directory / 'source_a' / '1.html')
    a1.touch()
    a2 = (in_directory / 'source_a' / '2.html')
    a2.touch()
    (in_directory / 'source_b').mkdir()
    b1 = (in_directory / 'source_b' / '1.html')
    b1.touch()
    b2 = (in_directory / 'source_b' / '2.html')
    b2.touch()
    return a1, a2, b1, b2


def test_no_files_to_list(tmp_path):
    """Test an empty in_directory using all of the optional parameters"""
    # Make temporary in_directory and base_dir directories
    base_dir, in_directory = make_directories(tmp_path)

    # Make the out_file we will save the output to
    out_file = (in_directory / 'out_file.txt')

    # Run fathom-list
    result = CliRunner().invoke(
        list_main,
        [
            in_directory.as_posix(),
            f'-o{out_file.as_posix()}',
        ],
    )
    assert result.exit_code == 0

    expected_file_contents = ""
    actual_file_contents = out_file.read_text()
    assert expected_file_contents == actual_file_contents


def test_without_base_dir(tmp_path):
    """Test omission of base-dir parameter"""
    # Make temporary in_directory and base_dir directories
    base_dir, in_directory = make_directories(tmp_path)

    # Make HTML files in in_directory in two separate subdirectories
    # so we can exercise the recursive option.
    a1, a2, b1, b2 = make_html_files(in_directory)

    # Make the out_file we will save the output to
    out_file = (base_dir / 'out_file.txt')

    # Run fathom-list
    result = CliRunner().invoke(
        list_main,
        [
            in_directory.as_posix(),
            '-r',
            f'-o{out_file.as_posix()}',
        ],
    )
    assert result.exit_code == 0

    expected_file_contents = [
        a1.relative_to(in_directory).as_posix(),
        a2.relative_to(in_directory).as_posix(),
        b1.relative_to(in_directory).as_posix(),
        b2.relative_to(in_directory).as_posix(),
    ]
    actual_file_contents = out_file.read_text().splitlines()
    assert expected_file_contents == actual_file_contents


def test_without_recursive(tmp_path):
    """Test omission of recursive parameter results in an empty output file"""
    base_dir, in_directory = make_directories(tmp_path)

    # Make HTML files in in_directory in two separate subdirectories.
    # We will see that fathom-list should not find these files since
    # the recursive option is not used.
    make_html_files(in_directory)

    # Make the out_file we will save the output to
    out_file = (base_dir / 'out_file.txt')

    # Run fathom-list
    result = CliRunner().invoke(
        list_main,
        [
            in_directory.as_posix(),
            f'-b{base_dir.as_posix()}',
            f'-o{out_file.as_posix()}',
        ],
    )
    assert result.exit_code == 0

    expected_file_contents = ""
    actual_file_contents = out_file.read_text()
    assert expected_file_contents == actual_file_contents


def test_in_directory_does_not_exist():
    """Test giving an invalid path for in_directory causes an error"""
    # Run fathom-list
    result = CliRunner().invoke(
        list_main,
        [
            'fake_in_dir',
        ],
    )
    # Assert the program exited with an error message about in directory not existing
    assert result.exit_code == 2
    assert '"fake_in_dir" does not exist.' in result.output


def test_base_dir_does_not_exist(tmp_path):
    """Test giving an invalid path for base-dir causes an error"""
    _, in_directory = make_directories(tmp_path)

    # Run fathom-list
    result = CliRunner().invoke(
        list_main,
        [
            in_directory.as_posix(),
            '-bfake_base_dir',
        ],
    )
    # Assert the program exited with an error message about base_dir not existing
    assert result.exit_code == 2
    assert '"fake_base_dir" does not exist.' in result.output
