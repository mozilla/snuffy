import pathlib

from click import argument, command, File, option, Path


@command()
@argument('in_directory', type=Path(exists=True, file_okay=False))
@option('--base-dir', '-b', type=Path(exists=True, file_okay=False),
        help='The directory to create relative paths from.')
@option('--recursive', '-r', default=False, is_flag=True,
        help='Recursively list files from the IN_DIRECTORY and all subdirectories.')
@option('--out-file', '-o', type=File(mode='w'), default=None,
        help='A file for saving the printed filenames for easy future reference.')
def main(in_directory, base_dir, recursive, out_file):
    """
    Lists relative paths of HTML files in a IN_DIRECTORY relative to BASE_DIR, one filename per line.
    If BASE_DIR is not specified, paths are relative to IN_DIRECTORY. Optionally saves output to OUT_FILE.
    Optionally performs the listing recursively.

    This is useful for vectorizing samples using FathomFox. FathomFox expects input filenames copied into a text box
    with one filename per line and relative to some path you are serving files from using fathom-serve.
    """
    if base_dir is None:
        base_dir = in_directory
    base_dir = pathlib.Path(base_dir)

    if recursive:
        path_iterator = pathlib.Path(in_directory).rglob('*.html')
    else:
        path_iterator = pathlib.Path(in_directory).glob('*.html')

    if out_file is not None:
        filenames_to_save = []

    for file in path_iterator:
        relative_path = file.relative_to(base_dir)
        print(relative_path)

        if out_file is not None:
            filenames_to_save.append(relative_path.as_posix() + '\n')

    if out_file is not None:
        out_file.writelines(filenames_to_save)
