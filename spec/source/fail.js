var tagsToCompile = "<% %>";
var objectToString = Object.prototype.toString;
var isArray = Array.isArray || function isArrayPolyfill (object) {
	return objectToString.call(object) === "[object Array]";
};
var spaceRe = /\s+/;
var openingTagRe, closingTagRe, closingCurlyRe;
function escapeRegExp (string) {
	return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
}
if (typeof tagsToCompile === 'string')
	tagsToCompile = tagsToCompile.split(spaceRe, 1);
if (!isArray(tagsToCompile))
	throw new Error('Invalid tags: ' + tagsToCompile);

closingCurlyRe = new RegExp('\\s*' + escapeRegExp('}' + tagsToCompile[1]));