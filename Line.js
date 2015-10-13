/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global module */

(function() {
	"use strict";

	function Line(source, location) {
		this.source = source;
		this.location = location;
	}

	Line.prototype.source = undefined;
	Line.prototype.location = undefined;

	Line.prototype.startsBefore = function(other) {
		return this.location.start.line - other.location.start.line;
	};

	module.exports = Line;

})();