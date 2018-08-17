import {readdirSync, statSync} from 'fs';
import {join} from 'path';

import {jsdom} from 'jsdom/lib/old-api';


/**
 * @return {String[]} The name (not path) of each directory directly within a
 *      given path
 */
function dirsIn(path) {
    return readdirSync(path).filter(f => statSync(join(path, f)).isDirectory());
}

/**
 * Parse an HTML doc, and return a DOM-compliant interface to it. Do not
 * execute any of its inline scripts.
 */
function staticDom(html) {
    return jsdom(html, {features: {ProcessExternalResources: false,
                                   FetchExternalResources: false}});
}

module.exports = {
    dirsIn,
    staticDom
};
