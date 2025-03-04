/**
 * qtools-functional-library.js
 * A collection of reusable utility functions for the application
 */

/**
 * Determines the precise type of an object
 * @param {any} obj - The object to check
 * @returns {string} The type of the object
 */
export function toType(obj) {
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    
    const type = typeof obj;
    if (['string', 'number', 'boolean', 'symbol', 'bigint', 'function'].includes(type)) {
        return type;
    }

    return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
}

/**
 * Creates or updates a nested property using a dotted path notation
 * @param {Object} baseObj - The base object to modify
 * @param {string} dottedPathString - Path to property using dot notation
 * @param {any} value - Value to set
 * @param {boolean} preserveExisting - If true, throws error when path conflicts with existing values
 * @returns {Object} The modified base object
 */
export function qtPutSurePath(baseObj, dottedPathString, value, preserveExisting) {
    var elements;
    var intermediate;
    var propName;
    let putDottedPathLastProgressiveString = '';

    preserveExisting =
        typeof preserveExisting != 'undefined' ? preserveExisting : false;

    if (baseObj == null) {
        throw 'qtGetDottedPath() says, baseObj cannot be nullx ' + dottedPathString;
    }
    if (dottedPathString.toString().match(/\.|\[/)) {
        var elements = dottedPathString.split(/\.|(\[.*?)]/);
    } else {
        var elements = [];
        elements.push(dottedPathString);
    }

    if (!dottedPathString) {
        return baseObj;
    }
    if (dottedPathString.match(/(__proto__|constructor|prototype)/)) {
        return baseObj; //avoid prototype pollution
    }

    if (elements.length < 2) {
        baseObj[dottedPathString] = value;
    } else {
        intermediate = baseObj;
        for (var i = 0, len = elements.length; i < len; i++) {
            if (elements[i]) {
                //mainly eliminates trailing periods but would also eliminates double periods and other regex anomalies
                propName = elements[i];

                if (elements[i + 1] && elements[i + 1].replace(/^\[/)) {
                    elements[i + 1] = elements[i + 1].replace(/^\[/, '');
                    var nextElement = [];
                    var nextElementType = 'array';
                } else {
                    var nextElement = {};
                    var nextElementType = 'object';
                }

                if (propName) {
                    //ignore trailing and redundant dots
                    if (
                        toType(intermediate[propName]) != nextElementType
                    ) {
                        intermediate[propName] = nextElement;
                    } else if (preserveExisting) {
                        throw (
                            "'preserveExisting' flag is set, found non-object in path: " +
                            propName +
                            ' in ' +
                            dottedPathString
                        );
                    }

                    intermediate = intermediate[propName];
                }
            }
        }

        intermediate = baseObj;
        for (var i = 0, len = elements.length; i < len - 1; i++) {
            if (elements[i]) {
                //mainly eliminates trailing periods but would also eliminate double periods
                propName = elements[i];
                intermediate = intermediate[propName];
            }
        }

        intermediate[elements[len - 1]] = value;
    }
    return baseObj;
}

// Plugin to expose utility functions to the Nuxt app
export default defineNuxtPlugin(nuxtApp => {
  // Add the utility functions to the Nuxt context
  nuxtApp.provide('toType', toType);
  nuxtApp.provide('qtPutSurePath', qtPutSurePath);
  
  console.log('qtools-functional-library initialized');
});