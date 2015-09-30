/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global exports, require */

(function() {
	"use strict";

	var esprima = require("esprima");
	var ASTApi = require("./ASTApi");

	exports.infoForLine = function(line) {
		var lineInfo = {};
		var astTraverse = new ASTApi(esprima.parse(line, {loc: true}), lineInfo);

		astTraverse.on("VariableDeclarator", function(declaration, info, defaultBehaviour) {

			info.rValue = {
				name: declaration.id.name,
				range: [declaration.id.loc.start.column, declaration.id.loc.end.column]
			};

			info.type = "Declaration";

			defaultBehaviour();
		});

		astTraverse.on("VariableDeclarator::Init", function(init, info) {
			info.lValue = {
				name: init.name,
				value: init.value,
				range: [init.loc.start.column, init.loc.end.column]
			};

			info.type = "Initialisation";
		});

		astTraverse.on("AssignmentExpression", function(expression, info) {

			info.lValue = {
				name: expression.left.name,
				range: [expression.left.loc.start.column, expression.left.loc.end.column]
			};

			info.rValue = {
				name: expression.right.name,
				range: [expression.right.loc.start.column, expression.right.loc.end.column]
			};

			info.type = "Assignment";
		});

		astTraverse.trace();

		return lineInfo;
	};

})();