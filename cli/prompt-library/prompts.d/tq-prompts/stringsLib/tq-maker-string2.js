#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction = ({ moduleName } = {}) => () => {

	return `
	Merge these new segment into the base to produce a final, merged object. Attributes of new segment elements should be applied to existing base elements. Review the object for consistency and coherence. if elements of the same type have the same refId, change them so they are all different UUIDs.

This is important, if the new segment has elements that are the same type as elements in the base, the new elements should be merged into the corresponding base elements. The merged XML should have at most two subordinate elements of the same type. Review the similar elements for repetition and revise the test data if necessary. It is crucial that all elements of the Base are retained. 

For example, you might get

example base

<Examples>
\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174000\">
\t\t<Sub1> hello </Sub1>
\t\t<Sub2> goodbye </Sub2>
\t</Example>
\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174001\">
\t\t<Sub1> orange </Sub1>
\t\t<Sub2> black </Sub2>
\t</Example>
</Examples>

example new segment:

<Example>
\t<NewSub>kitten</NewSub>
</Example>

The new merged element could look like this before you revise the facts 'kitten' to be different.

<Examples>
\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174000\">
\t\t<Sub1> hello </Sub1>
\t\t<Sub2> goodbye </Sub2>
\t<NewSub>kitten</NewSub>
\t</Example>
\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174001\">
\t\t<Sub1> orange </Sub1>
\t\t<Sub2> black </Sub2>
\t<NewSub>kitten</NewSub>
\t</Example>
</Examples>

It is crucial that all existing elements be kept and shown in your response. Never eliminate elements from the base. In the example below, notice that the elements Sub1 and Sub2 are retained with NewSub being added (then revised to prevent duplication). Never ever ever replace Base XML with comments such as, \"<!-- Existing Example data here -->\". That makes the result completely useless.

Example of merging new data while keeping elements: 

<Examples>
\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174000\">
        <!-- Existing Example data here -->
\t\t<NewSub>kitten</NewSub>
\t</Example>
\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174001\">
        <!-- Existing Example data here -->
\t\t<NewSub>kitten</NewSub>
\t</Example>
</Examples>

CRUCIAL POINT: NONE OF THE ELEMENTS (Examples, Sub1, etc) SHOWN IN THE EXAMPLES ABOVE SHOULD APPEAR IN THE RESULTING OBJECT. THEY ARE ILLUSTRATIONS ONLY.

Finally, the top level element requires a namespace identification. For this project it is:

 xmlns="http://www.sifassociation.org/datamodel/na/4.x"
 
EC,

<Example  xmlns="http://www.sifassociation.org/datamodel/na/4.x">
</Example>

Here is the real data:

Definition of the entire object:

<!elementSpecWorksheetJson!>

The final object should be consistent with this information. The sequence of XML elements should appear in the same order as their xPaths appear in this specification.

Base:

<!potentialFinalObject!>

Merge this new segment. 

This merged element is to be a complete XML object for testing.

New segment:

<!newXmlSegment!>


Wrap the resulting XML with delimiters like this:

<!frontDelimiter!>
 MERGED XML GOES HERE
<!backDelimitter!>

There should be *nothing* except well-formed XML between those delimiters.


		`;
};

//END OF moduleFunction() ============================================================

	module.exports = moduleFunction({ moduleName });