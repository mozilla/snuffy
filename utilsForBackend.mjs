/**
 * Things that work only on a command-line node.js environment
 */

import {jsdom} from 'jsdom/lib/old-api';


/**
 * Parse an HTML doc, and return a DOM-compliant interface to it. Do not
 * execute any of its inline scripts.
 */
export function staticDom(html) {
    return jsdom(html, {features: {ProcessExternalResources: false,
                                   FetchExternalResources: false}});
}
