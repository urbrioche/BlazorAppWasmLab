/*!
 * ParamQuery Pro v8.2.1
 * 
 * Copyright (c) 2012-2021 Paramvir Dhindsa (http://paramquery.com)
 * Released under Commercial license
 * http://paramquery.com/pro/license
 * 
 */
if (typeof require == "function") {
	var jQuery = require("jquery-ui-pack"),
		pq = {},
		JSZip = require("jszip");
	module.exports = pq
} else {
	var jQuery = window.jQuery,
		pq = window.pq = window.pq || {},
		JSZip = window.JSZip
}(function($) {
	var mixin = pq.mixin = {};
	mixin.render = {
		getRenderVal: function(objP, render, iGV) {
			var column = objP.column,
				cer = column.exportRender;
			if ((render && cer !== false || cer) && (column.render || column._render || column.format || column._renderG)) {
				return iGV.renderCell(objP)
			} else {
				return [objP.rowData[objP.dataIndx], ""]
			}
		},
		getTitle: function(cell, colIndx) {
			var title = cell.title;
			if (title != null) {
				if (typeof title == "function") {
					title = title.call(this.that, {
						colIndx: colIndx,
						column: cell,
						dataIndx: cell.dataIndx,
						Export: true
					})
				}
			} else {
				title = ""
			}
			return title
		}
	};
	mixin.GrpTree = {
		buildCache: function() {
			var self = this,
				o = self.that.options,
				isTree = self.isTree,
				data = isTree ? o.dataModel.data : self.that.pdata,
				cache = self.cache = {},
				id = self.id,
				rd, rId, i = 0,
				len = data.length;
			for (; i < len; i++) {
				rd = data[i];
				if (isTree || rd.pq_gtitle) {
					rId = rd[id];
					if (rId != null) {
						cache[rId] = rd
					} else {
						throw "unknown id of row"
					}
				}
			}
		},
		cascadeInit: function() {
			if (this.getCascadeInit()) {
				var self = this,
					arr = [],
					cbId = self.cbId,
					that = self.that,
					select = self.Model.select,
					data = that.pdata,
					rd, i = 0,
					len = data.length;
				for (; i < len; i++) {
					rd = data[i];
					if (rd[cbId]) {
						if (self.isEditable(rd)) {
							arr.push(rd);
							delete rd[cbId]
						} else if (select) {
							rd.pq_rowselect = true
						}
					} else if (rd[cbId] === null) {
						delete rd[cbId]
					}
				}
				if (arr.length) {
					self.checkNodes(arr, null, null, true)
				}
			}
		},
		cascadeNest: function(data) {
			var self = this,
				cbId = self.cbId,
				prop = self.prop,
				childstr = self.childstr,
				len = data.length,
				parentAffected, i = 0,
				rd, child;
			for (; i < len; i++) {
				rd = data[i];
				if (rd[prop]) {
					parentAffected = true;
					self.eachChild(rd, self.chkEachChild(cbId, rd[cbId], prop));
					delete rd[prop]
				}
				if ((child = rd[childstr]) && child.length) self.cascadeNest(child)
			}
			if (parentAffected && self.hasParent(rd)) {
				self.eachParent(rd, self.chkEachParent(cbId))
			}
		},
		checkAll: function(check, evt) {
			check = check == null ? true : check;
			var self = this,
				that = self.that;
			return self.checkNodes(that.pdata, check, evt, null, true)
		},
		checkNodes: function(arr, check, evt, init, all) {
			if (check == null) check = true;
			var rd, ri, i = 0,
				len = arr.length,
				rows = [],
				ui = {
					check: check
				},
				self = this,
				that = self.that,
				offset = that.riOffset,
				cbId = self.cbId,
				prop = self.prop,
				TM = self.Model,
				cascadeCheck = all ? false : self.isCascade(TM),
				fireEvent = init && TM.eventForInit || !init,
				ret, select = TM.select;
			for (; i < len; i++) {
				rd = arr[i];
				if (this.isEditable(rd)) {
					ri = rd.pq_ri;
					rows.push({
						rowData: rd,
						rowIndx: ri,
						rowIndxPage: ri - offset
					})
				}
			}
			ui.rows = rows;
			ui.dataIndx = self.colUI.dataIndx;
			if (init) ui.init = init;
			if (fireEvent) {
				ret = that._trigger("beforeCheck", evt, ui)
			}
			if (ret !== false) {
				rows = ui.rows;
				len = rows.length;
				if (len) {
					var chkRows = this.chkRows = [];
					for (i = 0; i < len; i++) {
						rd = rows[i].rowData;
						cascadeCheck && (rd[prop] = true);
						chkRows.push({
							rd: rd,
							val: check,
							oldVal: rd[cbId]
						});
						rd[cbId] = check
					}
					cascadeCheck && self.cascadeNest(self.getRoots());
					if (select) this.selectRows();
					if (cascadeCheck) {
						ui.getCascadeList = self.getCascadeList(self)
					}
					fireEvent && that._trigger("check", evt, ui);
					chkRows.length = 0
				}
			}
			self.setValCBox();
			if (!init) {
				that.refresh({
					header: false
				})
			}
		},
		chkEachChild: function(cbId, inpChk, prop) {
			return function(rd) {
				if (this.isEditable(rd)) {
					if (!prop || !rd[prop]) {
						var oldVal = rd[cbId];
						if (inpChk !== null && oldVal !== inpChk) {
							this.chkRows.push({
								rd: rd,
								val: inpChk,
								oldVal: oldVal
							});
							rd[cbId] = inpChk
						}
					}
				}
			}
		},
		chkEachParent: function(cbId) {
			var childstr = this.childstr;
			return function(rd) {
				if (this.isEditable(rd)) {
					var child = rd[childstr],
						countTrue = 0,
						countFalse = 0,
						oldVal = rd[cbId],
						rd2, chk, chk2;
					for (var i = 0, len = child.length; i < len; i++) {
						rd2 = child[i];
						if (this.isEditable(rd2)) {
							chk2 = rd2[cbId];
							if (chk2) {
								countTrue++
							} else if (chk2 === null) {
								chk = null;
								break
							} else {
								countFalse++
							}
							if (countTrue && countFalse) {
								chk = null;
								break
							}
						}
					}
					if (chk === undefined) {
						chk = countTrue ? true : false
					}
					if (oldVal !== chk) {
						this.chkRows.push({
							rd: rd,
							val: chk,
							oldVal: oldVal
						});
						rd[cbId] = chk
					}
				}
			}
		},
		eachChild: function(node, fn, parent) {
			fn.call(this, node, parent);
			var childstr = this.childstr,
				child = node[childstr] || [],
				rd, i = 0,
				len = child.length;
			for (; i < len; i++) {
				rd = child[i];
				if (rd[childstr]) {
					this.eachChild(rd, fn, node)
				} else {
					fn.call(this, rd, node)
				}
			}
		},
		eachParent: function(node, fn) {
			while (node = this.getParent(node)) {
				fn.call(this, node)
			}
		},
		_flatten: function(data, parentRD, level, data2) {
			var self = this,
				len = data.length,
				id = self.id,
				pId = self.parentId,
				i = 0,
				rd, child, childstr = self.childstr;
			for (; i < len; i++) {
				rd = data[i];
				rd.pq_level = level;
				data2.push(rd);
				if (parentRD) {
					rd[pId] = id ? parentRD[id] : parentRD
				}
				child = rd[childstr];
				if (child) {
					self._flatten(child, rd, level + 1, data2)
				}
			}
		},
		flatten: function(data) {
			var data2 = [];
			this._flatten(data, null, 0, data2);
			return data2
		},
		getCascadeInit: function() {
			var ci = this._cascadeInit;
			this._cascadeInit = true;
			return ci
		},
		getNode: function(id) {
			return this.cache[id]
		},
		getParent: function(rd) {
			var pId = rd[this.parentId];
			return this.cache[pId]
		},
		fillState: function(obj) {
			var self = this,
				id, childstr = self.childstr,
				rd, cache = self.cache;
			for (id in cache) {
				rd = cache[id];
				if (rd[childstr]) obj[id] = rd.pq_close || false
			}
			return obj
		},
		hasParent: function(rd) {
			return rd[this.parentId] != null
		},
		getRoots: function(_data) {
			var that = this.that,
				data = _data || that.pdata || [],
				len = data.length,
				i = 0,
				rd, data2 = [];
			for (; i < len; i++) {
				rd = data[i];
				if (rd.pq_level === 0 && !rd.pq_gsummary) {
					data2.push(rd)
				}
			}
			if (len && !data2.length) {
				data2 = data
			}
			return data2
		},
		setCascadeInit: function(val) {
			this._cascadeInit = val
		},
		getCascadeList: function(self) {
			var list = [];
			return function() {
				if (!list.length) {
					var rows = self.chkRows,
						i = 0,
						cbId = self.cbId,
						len = rows.length;
					for (; i < len; i++) {
						var row = rows[i],
							rd = row.rd,
							ri = rd.pq_ri,
							newRow = {},
							oldRow = {};
						newRow[cbId] = row.val;
						oldRow[cbId] = row.oldVal;
						list.push({
							rowIndx: ri,
							rowData: rd,
							newRow: newRow,
							oldRow: oldRow
						})
					}
				}
				return list
			}
		},
		getChildren: function(node) {
			return (node ? node[this.childstr] : this.getRoots()) || []
		},
		getSummary: function(node) {
			return node.pq_child_sum
		},
		isAncestor: function(rdChild, rdParent) {
			var rd = rdChild;
			while (rd = this.getParent(rd)) {
				if (rd == rdParent) {
					return true
				}
			}
		},
		isEmpty: function(node) {
			return !(node[this.childstr] || []).length
		},
		isCascade: function(model) {
			return model.cascade && model.checkbox && !model.maxCheck
		},
		isEditable: function(rd) {
			if (rd.pq_gsummary) {
				return false
			}
			var that = this.that,
				editable, col = this.colCB;
			if (col && (editable = col.editable)) {
				if (typeof editable == "function") {
					return editable.call(that, {
						rowData: rd
					})
				} else {
					return editable
				}
			} else {
				return true
			}
		},
		isFolder: function(rd) {
			return rd.pq_close != null || !!rd[this.childstr]
		},
		onCheckbox: function(self, TM) {
			return function(evt, ui) {
				if (TM.checkbox && self.colUI == ui.column) {
					self.checkNodes([ui.rowData], ui.input.checked, evt)
				}
			}
		},
		onCMInit: function() {
			var self = this,
				that = self.that,
				columns = that.columns,
				colUI, colCB, isTree = self.isTree,
				CM = that.colModel,
				firstCol, M = self.Model;
			if (M.titleInFirstCol && CM) {
				firstCol = CM.find(function(col) {
					return !col.hidden
				});
				M.titleIndx = firstCol.dataIndx = (firstCol.dataIndx == null ? Math.random() : firstCol.dataIndx).toString()
			}
			if (M.checkbox && columns) {
				colCB = columns[M.cbId] || {
					dataIndx: M.cbId
				};
				colCB.cb = {
					check: true,
					uncheck: false,
					select: M.select,
					header: M.checkboxHead,
					maxCheck: M.maxCheck
				};
				colUI = isTree ? columns[M.dataIndx] : columns[M.titleIndx]
			}
			self.colCB = colCB;
			self.colUI = colUI;
			if (columns && isTree) self.setCellRender()
		},
		onCustomSortTree: function(evt, ui) {
			var self = this,
				data = self.getRoots(ui.data);
			self.sort(data, ui.sort_composite);
			ui.data = self.flatten(data);
			return false
		},
		onRefresh: function(self, TM) {
			return function() {
				if (TM.checkbox) {
					var $inp = this.$cont.find(".pq_indeter"),
						i = $inp.length;
					while (i--) {
						$inp[i].indeterminate = true
					}
				}
			}
		},
		refreshView: function(source) {
			this.that.refreshView({
				header: false,
				source: source
			})
		},
		renderCB: function(checkbox, rd, cbId) {
			if (rd.pq_gsummary) {
				return ""
			}
			var that = this.that,
				checked = "",
				disabled = "",
				indeter = "",
				cls;
			if (typeof checkbox == "function") {
				checkbox = checkbox.call(that, rd)
			}
			if (checkbox) {
				rd[cbId] && (checked = "checked");
				if (!this.isEditable(rd)) {
					disabled = "disabled";
					cls = "pq_disable"
				}
				rd[cbId] === null && (indeter = "class='pq_indeter'");
				return ["<input type='checkbox' " + indeter + " " + checked + " " + disabled + "/>", cls]
			}
		},
		selectRows: function() {
			var i = 0,
				rows = this.chkRows,
				len = rows.length;
			for (; i < len; i++) {
				var row = rows[i],
					rd = row.rd,
					val = row.val;
				rd.pq_rowselect = val
			}
		},
		sort: function(_data, sort_composite) {
			var childstr = this.childstr,
				getSortComp = function(level) {
					return typeof sort_composite == "function" ? sort_composite : sort_composite[level]
				};
			(function sort(data, sort_comp) {
				var len = data.length,
					i = 0,
					nodes;
				if (len) {
					if (sort_comp) data.sort(sort_comp);
					sort_comp = getSortComp(data[0].pq_level + 1);
					for (; i < len; i++) {
						if (nodes = data[i][childstr]) {
							sort(nodes, sort_comp)
						}
					}
				}
			})(_data, getSortComp(0))
		},
		copyArray: function(arrD, arrS) {
			for (var i = 0, len = arrS.length; i < len; i++) {
				arrD.push(arrS[i])
			}
		},
		_summaryT: function(dataT, pdata, dxs, summaryTypes, columns, T, rdParent) {
			var self = this,
				childstr = self.childstr,
				isGroup = self.isGroup,
				isTree = self.isTree,
				summaryInTitleRow = T.summaryInTitleRow,
				showSummary = T.showSummary,
				includeSingleSummary = !T.skipSingleSummary,
				titleIndx = T.titleIndx,
				i = 0,
				len = dataT.length,
				f = 0,
				cells = {},
				sumRow = {},
				sumRow2, rd, nodes, summaryType, dataIndx, id = self.id,
				parentId = self.parentId,
				diLevel = isGroup && rdParent ? T.dataIndx[rdParent.pq_level] : "",
				rows = [],
				dxsLen = dxs.length,
				_aggr = pq.aggregate;
			for (; f < dxsLen; f++) {
				dataIndx = dxs[f];
				cells[dataIndx] = []
			}
			for (; i < len; i++) {
				rd = dataT[i];
				sumRow2 = null;
				pdata.push(rd);
				if (nodes = rd[childstr]) {
					sumRow2 = self._summaryT(nodes, pdata, dxs, summaryTypes, columns, T, rd);
					for (f = 0; f < dxsLen; f++) {
						dataIndx = dxs[f];
						self.copyArray(cells[dataIndx], sumRow2[1][dataIndx])
					}
					self.copyArray(rows, sumRow2[2])
				}
				if (isTree && (!summaryInTitleRow || !self.isFolder(rd)) || isGroup && !rd.pq_gtitle) {
					for (f = 0; f < dxsLen; f++) {
						dataIndx = dxs[f];
						cells[dataIndx].push(rd[dataIndx])
					}
					rows.push(rd)
				}
			}
			sumRow.pq_level = rdParent ? rdParent.pq_level : 0;
			if (T.grandSummary) {
				sumRow.pq_grandsummary = true
			}
			if (rdParent && (isTree && !summaryInTitleRow || isGroup && showSummary[rdParent.pq_level])) {
				sumRow[parentId] = rdParent[id];
				if (includeSingleSummary || len > 1) pdata.push(sumRow);
				rdParent.pq_child_sum = sumRow;
				sumRow.pq_hidden = rdParent.pq_close
			}
			for (f = 0; f < dxsLen; f++) {
				dataIndx = dxs[f];
				summaryType = summaryTypes[f];
				summaryType = summaryType[diLevel] || summaryType.type;
				sumRow[dataIndx] = _aggr[summaryType](cells[dataIndx], columns[f], rows, sumRow);
				if (summaryInTitleRow && rdParent) {
					if (dataIndx != titleIndx) rdParent[dataIndx] = sumRow[dataIndx]
				}
			}
			sumRow.pq_gsummary = true;
			return [sumRow, cells, rows]
		},
		summaryT: function() {
			var self = this,
				that = self.that,
				o = that.options,
				T = self.Model,
				roots = self.getRoots(),
				pdata = [],
				summaryTypes = [],
				dxs = [],
				columns = [],
				v = 0,
				column, summary, grandSumRow, CM = that.colModel,
				CMLength = CM.length;
			for (; v < CMLength; v++) {
				column = CM[v];
				summary = column.summary;
				if (summary && summary.type) {
					dxs.push(column.dataIndx);
					columns.push(column);
					summaryTypes.push(summary)
				}
			}
			grandSumRow = self._summaryT(roots, pdata, dxs, summaryTypes, columns, T)[0];
			if (T.grandSummary) {
				self.summaryData = o.summaryData = [grandSumRow]
			} else {
				(self.summaryData || []).length = 0
			}
			that.pdata = pdata
		}
	}
})(jQuery);
(function($) {
	var mixin = pq.mixin,
		ISIE = true;
	$(document).one("pq:ready", function() {
		var $inp = $("<input type='checkbox' style='position:fixed;left:-50px;top:-50px;'/>").appendTo(document.body);
		$inp[0].indeterminate = true;
		$inp.on("change", function() {
			ISIE = false
		});
		$inp.click();
		$inp.remove()
	});
	mixin.ChkGrpTree = {
		getCheckedNodes: function(all) {
			var that = this.that,
				data = all ? that.getData() : that.options.dataModel.data,
				len = data.length,
				i = 0,
				rd, arr = [],
				column = this.colCB || {},
				check = (column.cb || {}).check,
				cbId = column.dataIndx;
			if (cbId != null) {
				for (; i < len; i++) {
					rd = data[i];
					if (rd[cbId] === check) {
						arr.push(rd)
					}
				}
			}
			return arr
		},
		hasCboxHead: function() {
			return ((this.colCB || {}).cb || {}).header
		},
		isHeadChecked: function() {
			return this.inpVal
		},
		onBeforeCheck: function(evt, ui) {
			if (ui.check && this.colCB) {
				var colCB = this.colCB,
					cb = colCB.cb,
					select = cb.select,
					maxCheck = cb.maxCheck;
				if (maxCheck && this.colUI.dataIndx == ui.dataIndx) {
					var ul = ui.rows.slice(0, maxCheck),
						toCheck = ul.length,
						di = colCB.dataIndx,
						nodes = this.getCheckedNodes(true),
						toUncheck = toCheck + nodes.length - maxCheck;
					if (toUncheck > 0) {
						nodes.slice(0, toUncheck).forEach(function(rd) {
							rd[di] = cb.uncheck;
							if (select) {
								delete rd.pq_rowselect
							}
						})
					}
					ui.rows = ul
				}
			}
		},
		onHeaderChange: function(evt) {
			if (this.checkAll(evt.target.checked, evt) === false) {
				this.refreshHeadVal()
			}
		},
		onRefreshHeader: function() {
			var self = this,
				that = self.that;
			if (self.hasCboxHead()) {
				if (self.model == "groupModel" && !that.options[self.model].on) {
					return
				}
				var $td = that.getCellHeader({
						dataIndx: self.colUI.dataIndx
					}),
					$inp = $td.find("input");
				if (!$inp.length) {
					$td.find(".pq-title-span").prepend('<input type="checkbox" />');
					$inp = $td.find("input")
				}
				if (!self.$inp || $inp[0] != self.$inp[0]) {
					self.$inp = $inp;
					self.refreshHeadVal();
					if (ISIE) {
						$inp.on("click", function(evt) {
							if ($inp.data("pq_value") == null) {
								$inp[0].checked = true;
								$inp.data("pq_value", true);
								self.onHeaderChange(evt)
							}
						})
					}
					$inp.on("change", function(evt) {
						self.onHeaderChange(evt)
					})
				}
			}
		},
		refreshHeadVal: function() {
			if (this.$inp) this.$inp.pqval({
				val: this.inpVal
			})
		},
		setValCBox: function() {
			if (!this.hasCboxHead()) {
				return
			}
			var that = this.that,
				options = that.options,
				col = this.colCB,
				di = col.dataIndx,
				ci = that.colIndxs[di],
				cb = col.cb,
				cbAll = cb.all,
				remotePage = options.pageModel.type == "remote",
				offset = remotePage || !cbAll ? that.riOffset : 0,
				data = cbAll ? options.dataModel.data : that.pdata,
				val = null,
				selFound = 0,
				rd, ri, rows = 0,
				unSelFound = 0;
			if (!data) {
				return
			}
			for (var i = 0, len = data.length; i < len; i++) {
				rd = data[i];
				ri = i + offset;
				if (!rd.pq_gsummary && !rd.pq_gtitle && this.isEditable(rd, col, ri, ci, di)) {
					rows++;
					if (rd[di] === cb.check) {
						selFound++
					} else {
						unSelFound++
					}
				}
			}
			if (selFound == rows && rows) {
				val = true
			} else if (unSelFound == rows) {
				val = false
			}
			this.inpVal = val;
			this.refreshHeadVal()
		},
		unCheckAll: function() {
			this.checkAll(false)
		},
		unCheckNodes: function(arr, evt) {
			this.checkNodes(arr, false, evt)
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery = $.paramquery || {};
	var handleListeners = function(that, arg_listeners, evt, data) {
		var listeners = arg_listeners.slice(),
			i = 0,
			len = listeners.length,
			ret, removals = [];
		for (; i < len; i++) {
			var listener = listeners[i],
				cb = listener.cb,
				one = listener.one;
			if (one) {
				if (listener._oncerun) {
					continue
				}
				listener._oncerun = true
			}
			ret = cb.call(that, evt, data);
			if (ret === false) {
				evt.preventDefault();
				evt.stopPropagation()
			}
			if (one) {
				removals.push(i)
			}
			if (evt.isImmediatePropagationStopped()) {
				break
			}
		}
		if (len = removals.length) {
			for (i = len - 1; i >= 0; i--) {
				listeners.splice(removals[i], 1)
			}
		}
	};
	_pq._trigger = function(type, evt, data) {
		var self = this,
			prop, orig, this_listeners = self.listeners,
			listeners = this_listeners[type],
			o = self.options,
			allEvents = o.allEvents,
			bubble = o.bubble,
			$ele = self.element,
			callback = o[type];
		data = data || {};
		evt = $.Event(evt);
		evt.type = self.widgetName + ":" + type;
		evt.target = $ele[0];
		orig = evt.originalEvent;
		if (orig) {
			for (prop in orig) {
				if (!(prop in evt)) {
					evt[prop] = orig[prop]
				}
			}
		}
		if (allEvents) {
			if (typeof allEvents == "function") {
				allEvents.call(self, evt, data)
			}
		}
		if (listeners && listeners.length) {
			handleListeners(self, listeners, evt, data);
			if (evt.isImmediatePropagationStopped()) {
				return !evt.isDefaultPrevented()
			}
		}
		if (o.trigger) {
			$ele[bubble ? "trigger" : "triggerHandler"](evt, data);
			if (evt.isImmediatePropagationStopped()) {
				return !evt.isDefaultPrevented()
			}
		}
		if (callback) {
			var ret = callback.call(self, evt, data);
			if (ret === false) {
				evt.preventDefault();
				evt.stopPropagation()
			}
		}
		listeners = this_listeners[type + "Done"];
		if (listeners && listeners.length) {
			handleListeners(self, listeners, evt, data)
		}
		return !evt.isDefaultPrevented()
	};
	var event_on = function(that, type, cb, one, first) {
		var listeners = that.listeners[type];
		if (!listeners) {
			listeners = that.listeners[type] = []
		}
		listeners[first ? "unshift" : "push"]({
			cb: cb,
			one: one
		})
	};
	_pq.on = function() {
		var arg = arguments;
		if (typeof arg[0] == "boolean") {
			var first = arg[0],
				type = arg[1],
				cb = arg[2],
				one = arg[3]
		} else {
			var type = arg[0],
				cb = arg[1],
				one = arg[2]
		}
		var arr = type.split(" ");
		for (var i = 0; i < arr.length; i++) {
			var _type = arr[i];
			if (_type) {
				event_on(this, _type, cb, one, first)
			}
		}
		return this
	};
	_pq.one = function() {
		var len = arguments.length,
			arr = [];
		for (var i = 0; i < len; i++) {
			arr[i] = arguments[i]
		}
		arr[len] = true;
		return this.on.apply(this, arr)
	};
	var event_off = function(that, evtName, cb) {
		if (cb) {
			var listeners = that.listeners[evtName];
			if (listeners) {
				var removals = [];
				for (var i = 0, len = listeners.length; i < len; i++) {
					var listener = listeners[i],
						cb2 = listener.cb;
					if (cb == cb2) {
						removals.push(i)
					}
				}
				if (removals.length) {
					for (var i = removals.length - 1; i >= 0; i--) {
						listeners.splice(removals[i], 1)
					}
				}
			}
		} else {
			delete that.listeners[evtName]
		}
	};
	_pq.off = function(type, cb) {
		var arr = type.split(" ");
		for (var i = 0; i < arr.length; i++) {
			var _type = arr[i];
			if (_type) {
				event_off(this, _type, cb)
			}
		}
		return this
	};
	var fn = {
		options: {
			items: ".pq-grid-cell.pq-has-tooltip,.pq-grid-cell[title]",
			position: {
				my: "center top",
				at: "center bottom"
			},
			content: function() {
				var $td = $(this),
					$grid = $td.closest(".pq-grid"),
					grid = $grid.pqGrid("instance"),
					obj = grid.getCellIndices({
						$td: $td
					}),
					rowIndx = obj.rowIndx,
					dataIndx = obj.dataIndx,
					pq_valid = grid.data({
						rowIndx: rowIndx,
						dataIndx: dataIndx,
						data: "pq_valid"
					}).data;
				if (pq_valid) {
					var icon = pq_valid.icon,
						title = pq_valid.msg;
					title = title != null ? title : "";
					var strIcon = icon == "" ? "" : "<span class='ui-icon " + icon + " pq-tooltip-icon'></span>";
					return strIcon + title
				} else {
					return $td.attr("title")
				}
			}
		}
	};
	fn._create = function() {
		this._super();
		var $ele = this.element,
			eventNamespace = this.eventNamespace;
		$ele.on("pqtooltipopen" + eventNamespace, function(evt, ui) {
			var $grid = $(evt.target),
				$td = $(evt.originalEvent.target);
			$td.on("remove.pqtt", function(evt) {
				$grid.pqTooltip("close", evt, true)
			});
			if ($grid.is(".pq-grid")) {
				var grid = $grid.pqGrid("instance"),
					obj = grid.getCellIndices({
						$td: $td
					}),
					rowIndx = obj.rowIndx,
					dataIndx = obj.dataIndx,
					a, rowData = grid.getRowData({
						rowIndx: rowIndx
					});
				if ((a = rowData) && (a = a.pq_celldata) && (a = a[dataIndx]) && (a = a["pq_valid"])) {
					var valid = a,
						style = valid.style,
						cls = valid.cls;
					ui.tooltip.addClass(cls);
					var olds = ui.tooltip.attr("style");
					ui.tooltip.attr("style", olds + ";" + style)
				}
			}
		});
		$ele.on("pqtooltipclose" + eventNamespace, function(evt, ui) {
			var $grid = $(evt.target),
				$td = $(evt.originalEvent.target);
			$td.off(".pqtt")
		})
	};
	$.widget("paramquery.pqTooltip", $.ui.tooltip, fn)
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		_proto_ = Array.prototype;
	!_proto_.find && (_proto_.find = function(fn, context) {
		for (var i = 0, len = this.length, item; i < len; i++) {
			item = this[i];
			if (fn.call(context, item, i, this)) {
				return item
			}
		}
	});
	!_proto_.findIndex && (_proto_.findIndex = function(fn, context) {
		for (var i = 0, len = this.length, item; i < len; i++) {
			item = this[i];
			if (fn.call(context, item, i, this)) {
				return i
			}
		}
		return -1
	});
	$.extend(pq, {
		arrayUnique: function(arr, key) {
			var newarr = [],
				i, len = arr.length,
				str, obj = {},
				key2;
			for (i = 0; i < len; i++) {
				str = arr[i];
				key2 = key ? str[key] : str;
				if (obj[key2] == 1) {
					continue
				}
				obj[key2] = 1;
				newarr.push(str)
			}
			return newarr
		},
		cap1: function(str) {
			return str && str.length ? str[0].toUpperCase() + str.slice(1) : ""
		},
		elementFromXY: function(evt) {
			var x = evt.clientX,
				y = evt.clientY,
				$ele = $(document.elementFromPoint(x, y)),
				$e2;
			if ($ele.closest(".ui-draggable-dragging").length) {
				$e2 = $ele;
				$e2.hide();
				$ele = $(document.elementFromPoint(x, y));
				$e2.show()
			}
			return $ele
		},
		escapeHtml: function(val) {
			return val.replace(/&/g, "&amp;").replace(/<([a-z,A-Z]+)/g, "&lt;$1")
		},
		escapeXml: function(val) {
			return val.replace(/&/g, "&amp;").replace(/</g, "&lt;")
		},
		excelToJui: function() {
			var cache = {};
			return function(format) {
				var f = cache[format];
				if (!f) {
					f = format.replace(/yy/g, "y").replace(/dddd/g, "DD").replace(/ddd/g, "D").replace(/mmmm/g, "MM").replace(/mmm/g, "M");
					cache[format] = f
				}
				return f
			}
		}(),
		excelToNum: function() {
			var cache = {};
			return function(format) {
				var f = cache[format];
				if (!f) {
					f = format.replace(/\\/g, "");
					cache[format] = f
				}
				return f
			}
		}(),
		extend: function(base, sub, methods) {
			var fn = function() {};
			fn.prototype = base.prototype;
			var _p = sub.prototype = new fn,
				_bp = base.prototype,
				method;
			for (method in methods) {
				var _bpm = _bp[method],
					_spm = methods[method];
				if (_bpm) {
					_p[method] = function(_bpm, _spm) {
						return function() {
							var old_super = this._super,
								ret;
							this._super = function() {
								return _bpm.apply(this, arguments)
							};
							ret = _spm.apply(this, arguments);
							this._super = old_super;
							return ret
						}
					}(_bpm, _spm)
				} else {
					_p[method] = _spm
				}
			}
			_p.constructor = sub;
			_p._base = base;
			_p._bp = function(method) {
				var args = arguments;
				Array.prototype.shift.call(args);
				return _bp[method].apply(this, args)
			}
		},
		copyObj: function(objTarget, objSrc, arrExclude) {
			var key, val, propsExclude = pq.objectify(arrExclude);
			for (key in objSrc) {
				if (!propsExclude[key]) {
					val = objSrc[key];
					objTarget[key] = $.isPlainObject(val) ? $.extend(true, {}, val) : val
				}
			}
			return objTarget
		},
		extendT: function(objTarget, objSrc) {
			var key, val, descriptor;
			for (key in objSrc) {
				if (objTarget[key] === undefined) {
					descriptor = Object.getOwnPropertyDescriptor(objSrc, key);
					if (descriptor.get || descriptor.set) {
						Object.defineProperty(objTarget, key, descriptor);
						continue
					}
					val = objSrc[key];
					objTarget[key] = val && typeof val == "object" ? $.extend(true, {}, val) : val
				}
			}
			return objTarget
		},
		flatten: function(arr, arr2) {
			var i = 0,
				len = arr.length,
				val;
			arr2 = arr2 || [];
			for (; i < len; i++) {
				val = arr[i];
				if (val != null) {
					if (val.push) {
						pq.flatten(val, arr2)
					} else {
						arr2.push(val)
					}
				}
			}
			return arr2
		},
		toRC: function(part) {
			var arr = part.match(/([A-Z]*)(\d*)/),
				c = pq.toNumber(arr[1]),
				r;
			if (arr[2]) r = arr[2] - 1;
			return [r, c]
		},
		formatEx: function(column, val, condition, dt) {
			if (condition) {
				dt = dt || pq.getDataType(column);
				if (pq.filter.conditions[condition][dt]) return this.format(column, val, dt)
			}
			return val
		},
		format: function(column, val, dt) {
			var format = column.format;
			if (format && val != null) {
				if (typeof format == "function") {
					return format(val)
				}
				dt = dt || pq.getDataType(column);
				if (dt == "date") {
					try {
						var d = new Date(val);
						if (d && !isNaN(d.getTime())) {
							val = $.datepicker.formatDate(format, d)
						}
					} catch (ex) {}
				} else {
					val = pq.formatNumber(val, format)
				}
			}
			return val
		},
		onResize: function(ele, fn) {
			if (ele.attachEvent) ele.attachEvent("onresize", fn);
			else if (window.ResizeObserver) new window.ResizeObserver(fn).observe(ele);
			else if (window.addResizeListener) window.addResizeListener(ele, fn);
			else $(ele).resize(fn)
		},
		fileRead: function(file, type, fn) {
			var reader = new FileReader;
			reader[type](file);
			reader.onload = function() {
				fn(reader.result)
			}
		},
		fileToBase: function(file, fn) {
			pq.fileRead(file, "readAsDataURL", fn)
		},
		xmlhttp: function(url, responseType, fn) {
			var xhr = new XMLHttpRequest;
			xhr.onload = function() {
				fn(xhr.response)
			};
			xhr.open("GET", url);
			xhr.responseType = responseType;
			xhr.send()
		},
		urlToBase: function(url, fn) {
			pq.xmlhttp(url, "blob", function(response) {
				pq.fileToBase(response, fn)
			})
		},
		objectAttr: function(attr) {
			if (attr) {
				attr = attr.split(" ")
			}
		},
		deFormat: function(column, val, condition) {
			if (val) {
				var format = column.format,
					fr, found, dt;
				if (format) {
					dt = pq.getDataType(column);
					found = condition ? pq.filter.conditions[condition][dt] : true;
					if (found) {
						try {
							if (typeof format == "function") {
								val = column.deFormat(val)
							} else if (dt == "date") {
								fr = column.formatRaw || "mm/dd/yy";
								if (fr != format) {
									val = $.datepicker.parseDate(format, val);
									val = $.datepicker.formatDate(fr, val)
								}
							} else {
								val = pq.deFormatNumber(val, format)
							}
						} catch (ex) {
							val = null
						}
					}
				}
			}
			return val
		},
		fakeEvent: function($ele, event, timeout) {
			if (event == "timeout") {
				var to, evtName = "keyup change";
				$ele.off(evtName).on(evtName, function() {
					clearTimeout(to);
					to = setTimeout(function() {
						$ele.triggerHandler("timeout")
					}, timeout)
				})
			}
		},
		getAddress: function(addr) {
			var parts = addr.split(":"),
				part1 = this.toRC(parts[0]),
				r1 = part1[0],
				c1 = part1[1],
				part2 = this.toRC(parts[1] || parts[0]),
				r2 = part2[0],
				c2 = part2[1],
				rc, cc;
			if (!isNaN(r2)) rc = r2 - r1 + 1;
			if (!isNaN(c2)) cc = c2 - c1 + 1;
			return {
				r1: r1,
				c1: c1,
				rc: rc,
				cc: cc,
				r2: r2,
				c2: c2
			}
		},
		getClsVal: function(cls, str) {
			var match = cls.match(new RegExp("\\b" + str + "(\\S+)\\b"));
			return match ? match[1] : null
		},
		getDataType: function(column) {
			var dt = column.dataType,
				fdt;
			if (dt == "bool") fdt = "bool";
			else if (dt == "float" || dt == "integer") fdt = "number";
			else if (dt == "date") fdt = "date";
			return fdt || "string"
		},
		getFn: function() {
			var obj = {};
			return function(cb) {
				var fn = cb;
				if (typeof cb === "string") {
					if (!(fn = obj[cb])) {
						fn = window;
						cb.split(".").forEach(function(part) {
							fn = fn[part]
						});
						obj[cb] = fn
					}
				}
				return fn
			}
		}(),
		isCtrl: function(evt) {
			return evt.ctrlKey || evt.metaKey
		},
		isDateFormat: function() {
			var cache = {};
			return function(format) {
				var f = cache[format];
				if (f == null) {
					f = cache[format] = /^[mdy\s-\/\.,]*$/i.test(format)
				}
				return f
			}
		}(),
		isEmpty: function(obj) {
			for (var key in obj) {
				return false
			}
			return true
		},
		isObject: function(obj) {
			return Object.prototype.toString.call(obj) === "[object Object]"
		},
		juiToExcel: function() {
			var cache = {};
			return function(format) {
				var f = cache[format];
				if (!f) {
					f = format.replace(/y/g, "yy").replace(/DD/g, "dddd").replace(/D/g, "ddd").replace(/MM/g, "mmmm").replace(/M/g, "mmm");
					cache[format] = f
				}
				return f
			}
		}(),
		makePopup: function(ele, forEle, onClose) {
			var rand = (Math.random() + "").replace(".", ""),
				evt = "mousedown.pq" + rand + " keydown.pq" + rand,
				nodeName = forEle ? (forEle.nodeName || "").toLowerCase() : "",
				canSafe = nodeName == "input" || nodeName == "textarea",
				close = function(safe) {
					if (safe && canSafe && document.body.contains(forEle)) $ele.hide();
					else {
						$ele.remove();
						$(document).off(evt);
						if (onClose) onClose()
					}
				},
				$ele = $(ele);
			$ele.addClass("pq-popup").on("keydown", function(evt) {
				if (evt.keyCode == $.ui.keyCode.ESCAPE) {
					close(true)
				}
			});
			$(forEle).one("remove", function() {
				close()
			});
			requestAnimationFrame(function() {
				$(document).on(evt, function(evt) {
					var $t = $(evt.target);
					if (!ele.contains($t[0]) && !pq.isCtrl(evt) && !$t.closest(".ui-datepicker").length && !$t.closest(forEle).length) {
						close(true)
					}
				})
			})
		},
		moveItem: function(node, data, indxOld, indx) {
			if (indxOld > indx) {
				data.splice(indxOld, 1);
				data.splice(indx++, 0, node)
			} else if (indxOld == indx) {
				indx++
			} else {
				data.splice(indx, 0, node);
				data.splice(indxOld, 1)
			}
			return indx
		},
		newLine: function(dataCell) {
			return isNaN(dataCell) && typeof dataCell == "string" ? dataCell.replace(/(\r\n|\r|\n)/g, "<br>") : dataCell
		},
		numToExcel: function() {
			var cache = {};
			return function(format) {
				var f = cache[format];
				if (!f) {
					f = format.replace(/[^#0,.@%]/g, function(a) {
						return "\\" + a
					});
					cache[format] = f
				}
				return f
			}
		}(),
		objectify: function(arr) {
			var obj = {},
				len = arr.length;
			while (len--) {
				obj[arr[len]] = 1
			}
			return obj
		},
		styleObj: function(style) {
			if (typeof style == "string") {
				var arr = style.split(";");
				style = {};
				arr.forEach(function(_style) {
					if (_style) {
						arr = _style.split(":");
						if (arr[0] && arr[1]) style[arr[0].trim()] = arr[1].trim()
					}
				})
			}
			return style
		},
		styleStr: function(obj) {
			if (typeof obj != "string") {
				var arr = [],
					key, val;
				for (key in obj) {
					if (val = obj[key]) arr.push(key + ":" + val)
				}
				obj = arr.length ? arr.join(";") + ";" : ""
			}
			return obj
		},
		unescapeXml: function() {
			var obj = {
				amp: "&",
				lt: "<",
				gt: ">",
				quot: '"',
				apos: "'"
			};
			return function(val) {
				return val.replace(/&(amp|lt|gt|quot|apos);/g, function(a, b) {
					return obj[b]
				})
			}
		}()
	});
	_pq.select = function(objP) {
		var attr = objP.attr,
			opts = objP.options,
			groupIndx = objP.groupIndx,
			labelIndx = objP.labelIndx,
			valueIndx = objP.valueIndx,
			jsonFormat = labelIndx != null && valueIndx != null,
			grouping = groupIndx != null,
			prepend = objP.prepend,
			dataMap = objP.dataMap,
			groupV, groupVLast, jsonF, dataMapFn = function() {
				var jsonObj = {};
				for (var k = 0; k < dataMap.length; k++) {
					var key = dataMap[k];
					jsonObj[key] = option[key]
				}
				return "data-map='" + JSON.stringify(jsonObj) + "'"
			},
			buffer = ["<select ", attr, " >"];
		if (prepend) {
			for (var key in prepend) {
				buffer.push('<option value="', key, '">', prepend[key], "</option>")
			}
		}
		if (opts && opts.length) {
			for (var i = 0, len = opts.length; i < len; i++) {
				var option = opts[i];
				if (jsonFormat) {
					var value = option[valueIndx],
						disabled = option.pq_disabled ? 'disabled="disabled" ' : "",
						selected = option.pq_selected ? 'selected="selected" ' : "";
					if (value == null) {
						continue
					}
					jsonF = dataMap ? dataMapFn() : "";
					if (grouping) {
						var disabled_group = option.pq_disabled_group ? 'disabled="disabled" ' : "";
						groupV = option[groupIndx];
						if (groupVLast != groupV) {
							if (groupVLast != null) {
								buffer.push("</optgroup>")
							}
							buffer.push('<optgroup label="', groupV, '" ', disabled_group, " >");
							groupVLast = groupV
						}
					}
					if (labelIndx == valueIndx) {
						buffer.push("<option ", selected, disabled, jsonF, ">", value, "</option>")
					} else {
						var label = option[labelIndx];
						buffer.push("<option ", selected, disabled, jsonF, ' value="', value, '">', label, "</option>")
					}
				} else if (typeof option == "object") {
					for (var key in option) {
						buffer.push('<option value="', key, '">', option[key], "</option>")
					}
				} else {
					buffer.push("<option>", option, "</option>")
				}
			}
			if (grouping) {
				buffer.push("</optgroup>")
			}
		}
		buffer.push("</select>");
		return buffer.join("")
	};
	$.fn.pqval = function(obj) {
		if (obj) {
			if (obj.incr) {
				var val = this.data("pq_value");
				this.prop("indeterminate", false);
				if (val) {
					val = false;
					this.prop("checked", false)
				} else if (val === false) {
					val = null;
					this.prop("indeterminate", true);
					this.prop("checked", false)
				} else {
					val = true;
					this.prop("checked", true)
				}
				this.data("pq_value", val);
				return val
			} else {
				val = obj.val;
				this.data("pq_value", val);
				this.prop("indeterminate", false);
				if (val === null) {
					this.prop("indeterminate", true);
					this.prop("checked", false)
				} else if (val) {
					this.prop("checked", true)
				} else {
					this.prop("checked", false)
				}
				return this
			}
		} else {
			return this.data("pq_value")
		}
	};
	_pq.xmlToArray = function(data, obj) {
		var itemParent = obj.itemParent;
		var itemNames = obj.itemNames;
		var arr = [];
		var $items = $(data).find(itemParent);
		$items.each(function(i, item) {
			var $item = $(item);
			var arr2 = [];
			$(itemNames).each(function(j, itemName) {
				arr2.push($item.find(itemName).text().replace(/\r|\n|\t/g, ""))
			});
			arr.push(arr2)
		});
		return arr
	};
	_pq.xmlToJson = function(data, obj) {
		var itemParent = obj.itemParent;
		var itemNames = obj.itemNames;
		var arr = [];
		var $items = $(data).find(itemParent);
		$items.each(function(i, item) {
			var $item = $(item);
			var arr2 = {};
			for (var j = 0, len = itemNames.length; j < len; j++) {
				var itemName = itemNames[j];
				arr2[itemName] = $item.find(itemName).text().replace(/\r|\n|\t/g, "")
			}
			arr.push(arr2)
		});
		return arr
	};
	_pq.tableToArray = function(tbl) {
		var $tbl = $(tbl),
			colModel = [],
			data = [],
			$trs = $tbl.children("tbody").children("tr"),
			$trfirst = $trs.length ? $($trs[0]) : $(),
			$trsecond = $trs.length > 1 ? $($trs[1]) : $();
		$trfirst.children("th,td").each(function(i, td) {
			var $td = $(td),
				title = $td.html(),
				width = $td.width(),
				align = "left",
				dataType = "string";
			if ($trsecond.length) {
				var $tdsec = $trsecond.find("td:eq(" + i + ")"),
					halign = $tdsec.attr("align"),
					align = halign ? halign : align
			}
			var obj = {
				title: title,
				width: width,
				dataType: dataType,
				align: align,
				dataIndx: i
			};
			colModel.push(obj)
		});
		$trs.each(function(i, tr) {
			if (i == 0) {
				return
			}
			var $tr = $(tr);
			var arr2 = [];
			$tr.children("td").each(function(j, td) {
				arr2.push($.trim($(td).html()))
			});
			data.push(arr2)
		});
		return {
			data: data,
			colModel: colModel
		}
	};
	var _getNumFormat = function() {
		var _nformats = {},
			re;
		return function(format, negative) {
			var obj, arr, m;
			if (format) {
				arr = format.split(":");
				format = negative && arr.length > 1 ? arr[1] : arr[0];
				if (obj = _nformats[format]) {
					return obj
				}
				if (!re) re = /^([^#0]*|&#[^#0]*)?[\,\.#0]*?([\,\s\.]?)([#0]*)(([\,\s\.])([0]+))?([^#^0]*|&#[^#]*)?$/;
				m = format.match(re);
				if (m && m.length) {
					obj = {
						symbol: m[1] || "",
						thouSep: m[2],
						thousand: m[3].length,
						decSep: m[5] || "",
						decimal: (m[6] || []).length,
						symbolEnd: m[7] || ""
					};
					_nformats[format] = obj
				}
			}
			obj = obj || {
				symbol: "",
				symbolEnd: "",
				thouSep: ",",
				thousand: 3,
				decSep: ".",
				decimal: 2
			};
			return obj
		}
	}();
	_pq.formatCurrency = function(o_val, format) {
		if (!format || format == "@") {
			return o_val + ""
		}
		var val = parseFloat(o_val);
		if (isNaN(val) || val == "Infinity") {
			return
		}
		if ((format || "").indexOf("%") > 0) {
			val = val * 100
		}
		var negative = val < 0,
			obj = _getNumFormat(format, negative),
			symbol = obj.symbol,
			symbolEnd = obj.symbolEnd,
			thousand = obj.thousand,
			thouSep = obj.thouSep,
			decSep = obj.decSep,
			decimal = obj.decimal;
		val = val.toFixed(decimal);
		var len = val.length,
			sublen = decimal + decSep.length,
			fp = val.substring(0, len - sublen),
			lp = val.substring(len - sublen + decSep.length, len),
			arr = fp.match(/\d/g).reverse(),
			arr2 = [];
		for (var i = 0; i < arr.length; i++) {
			if (i > 0 && i % thousand == 0) {
				arr2.push(thouSep)
			}
			arr2.push(arr[i])
		}
		arr2 = arr2.reverse();
		fp = arr2.join("");
		return (negative ? "-" : "") + symbol + fp + decSep + lp + symbolEnd
	};
	pq.formatNumber = _pq.formatCurrency;
	pq.deFormatNumber = function(val, format) {
		var negative = val < 0,
			obj = _getNumFormat(format, negative),
			symbol = obj.symbol,
			symbolEnd = obj.symbolEnd,
			thouSep = obj.thouSep,
			decSep = obj.decSep;
		thouSep = thouSep === "." ? "\\." : thouSep;
		val = val.replace(symbol, "").replace(symbolEnd, "").replace(new RegExp(thouSep, "g"), "");
		if (decSep) val = val.replace(decSep, ".") * 1;
		return val
	};
	pq.valid = {
		isFloat: function(val) {
			var pf = val * 1;
			return !isNaN(pf) && pf == val
		},
		isInt: function(val) {
			var pi = parseInt(val);
			return !isNaN(pi) && pi == val
		},
		isDate: function(val) {
			return !isNaN(Date.parse(val))
		}
	};
	var NumToLetter = [],
		letterToNum = {},
		toLetter = pq.toLetter = function(num) {
			var letter = NumToLetter[num];
			if (!letter) {
				num++;
				var mod = num % 26,
					pow = num / 26 | 0,
					out = mod ? String.fromCharCode(64 + mod) : (--pow, "Z");
				letter = pow ? toLetter(pow - 1) + out : out;
				num--;
				NumToLetter[num] = letter;
				letterToNum[letter] = num
			}
			return letter
		};

	function _toNum(letter) {
		return letter.charCodeAt(0) - 64
	}
	pq.toNumber = function(letter) {
		var num = letterToNum[letter],
			len, i, _let, _num, indx;
		if (num == null && letter) {
			len = letter.length;
			num = -1;
			i = 0;
			for (; i < len; i++) {
				_let = letter[i];
				_num = _toNum(_let);
				indx = len - i - 1;
				num += _num * Math.pow(26, indx)
			}
			NumToLetter[num] = letter;
			letterToNum[letter] = num
		}
		return num
	};
	pq.generateData = function(rows, cols) {
		var alp = [];
		for (var i = 0; i < cols; i++) {
			alp[i] = toLetter(i)
		}
		var data = [];
		for (var i = 0; i < rows; i++) {
			var row = data[i] = [];
			for (var j = 0; j < cols; j++) {
				row[j] = alp[j] + (i + 1)
			}
		}
		return data
	};
	(function() {
		var type = "w",
			s = "scrollLeft";
		$(document).one("pq:ready", function() {
			var $ele = $("<div dir='rtl' style='visibilty:hidden;height:4px;width:4px;overflow:auto;'>rtl</div>").appendTo("body"),
				ele = $ele[0],
				sl = ele[s];
			if (sl == 0) {
				ele[s] = 100;
				type = ele[s] == 0 ? "g" : "i"
			}
			$ele.remove()
		});

		function isRtl(ele) {
			var rtl = ele.rtl;
			if (rtl == null) rtl = ele.rtl = $(ele).css("direction") == "rtl";
			return rtl
		}
		pq.scrollTop = function(ele) {
			return ele.scrollTop
		};
		pq[s + "Val"] = function(ele, val) {
			var rtl = isRtl(ele),
				sl;
			if (rtl) {
				if (type == "w") sl = ele.scrollWidth - ele.clientWidth - val;
				else if (type == "g") sl = -1 * val;
				else sl = val
			} else sl = val;
			return sl
		};
		pq[s] = function(ele, val) {
			var rtl = isRtl(ele),
				sl;
			if (val == null) {
				sl = ele[s];
				if (rtl) {
					if (type == "w") return ele.scrollWidth - ele.clientWidth - sl;
					if (type == "g") return sl * -1
				}
				return sl
			}
			ele[s] = pq[s + "Val"](ele, val)
		}
	})()
})(jQuery);
(function($) {
	pq.validations = {
		minLen: function(value, reqVal, getValue) {
			value = getValue(value);
			reqVal = getValue(reqVal);
			if (value.length >= reqVal) {
				return true
			}
		},
		nonEmpty: function(value) {
			if (value != null && value !== "") {
				return true
			}
		},
		maxLen: function(value, reqVal, getValue) {
			value = getValue(value);
			reqVal = getValue(reqVal);
			if (value.length <= reqVal) {
				return true
			}
		},
		gt: function(value, reqVal, getValue) {
			value = getValue(value);
			reqVal = getValue(reqVal);
			if (value > reqVal) {
				return true
			}
		},
		gte: function(value, reqVal, getValue) {
			value = getValue(value);
			reqVal = getValue(reqVal);
			if (value >= reqVal) {
				return true
			}
		},
		lt: function(value, reqVal, getValue) {
			value = getValue(value);
			reqVal = getValue(reqVal);
			if (value < reqVal) {
				return true
			}
		},
		lte: function(value, reqVal, getValue) {
			value = getValue(value);
			reqVal = getValue(reqVal);
			if (value <= reqVal) {
				return true
			}
		},
		neq: function(value, reqVal, getValue) {
			value = getValue(value);
			reqVal = getValue(reqVal);
			if (value !== reqVal) {
				return true
			}
		},
		regexp: function(value, reqVal) {
			if (new RegExp(reqVal).test(value)) {
				return true
			}
		}
	};
	var _pq = $.paramquery;
	_pq.cValid = function(that) {
		this.that = that
	};
	_pq.cValid.prototype = {
		_isValidCell: function(objP) {
			var that = this.that,
				column = objP.column,
				valids = column.validations;
			if (!valids || !valids.length) {
				return {
					valid: true
				}
			}
			var value = objP.value,
				fn, dataType = column.dataType,
				getValue = function(val) {
					return that.getValueFromDataType(val, dataType, true)
				},
				rowData = objP.rowData;
			if (!rowData) {
				throw "rowData required."
			}
			for (var j = 0; j < valids.length; j++) {
				var valid = valids[j],
					on = valid.on,
					type = valid.type,
					_valid = false,
					msg = valid.msg,
					reqVal = valid.value;
				if (on === false) {
					continue
				}
				if (fn = pq.validations[type]) {
					_valid = value == null ? false : fn(value, reqVal, getValue)
				} else if (type) {
					var obj2 = {
						column: column,
						value: value,
						rowData: rowData,
						msg: msg
					};
					if (that.callFn(type, obj2) === false) {
						_valid = false;
						msg = obj2.msg
					} else {
						_valid = true
					}
				} else {
					_valid = true
				}
				if (!_valid) {
					return {
						valid: false,
						msg: msg,
						column: column,
						warn: valid.warn,
						dataIndx: column.dataIndx,
						validation: valid
					}
				}
			}
			return {
				valid: true
			}
		},
		onScrollCell: function($td, msg, icon, cls, css, style) {
			var cell, that = this.that,
				o = that.options,
				bootstrap = o.bootstrap;
			if ($td || (cell = that.getEditCell()) && cell.$cell) {
				var $cell = $td || cell.$cell;
				$cell.attr("title", msg);
				var tooltipFn = "tooltip",
					tooltipShowFn = "open";
				if (bootstrap.on && bootstrap.tooltip) {
					tooltipFn = bootstrap.tooltip;
					tooltipShowFn = "show"
				}
				try {
					$cell[tooltipFn]("destroy")
				} catch (ex) {}
				$cell[tooltipFn]({
					trigger: "manual",
					position: {
						my: "left center+5",
						at: "right center"
					},
					content: function() {
						var strIcon = icon == "" ? "" : "<span class='ui-icon " + icon + " pq-tooltip-icon'></span>";
						return strIcon + msg
					},
					open: function(evt, ui) {
						var tt = ui.tooltip;
						if (cls) {
							tt.addClass(cls)
						}
						if (style) {
							var olds = tt.attr("style");
							tt.attr("style", olds + ";" + style)
						}
						if (css) {
							tt.tooltip.css(css)
						}
					}
				})[tooltipFn](tooltipShowFn)
			}
		},
		isValidCell: function(objP) {
			var self = this,
				that = self.that,
				rowData = objP.rowData,
				rowIndx = objP.rowIndx,
				value = objP.value,
				valueDef = objP.valueDef,
				column = objP.column,
				focusInvalid = objP.focusInvalid,
				o = that.options,
				bootstrap = o.bootstrap,
				allowInvalid = objP.allowInvalid,
				dataIndx = column.dataIndx,
				gValid = o.validation,
				gWarn = o.warning,
				EM = o.editModel,
				errorClass = EM.invalidClass,
				warnClass = EM.warnClass,
				ae = document.activeElement;
			if (objP.checkEditable) {
				if (that.isEditable({
						rowIndx: rowIndx,
						rowData: rowData,
						column: column,
						dataIndx: dataIndx
					}) == false) {
					return {
						valid: true
					}
				}
			}
			var objvalid = this._isValidCell({
					column: column,
					value: value,
					rowData: rowData
				}),
				_valid = objvalid.valid,
				warn = objvalid.warn,
				msg = objvalid.msg;
			if (!_valid) {
				var pq_valid = $.extend({}, warn ? gWarn : gValid, objvalid.validation),
					css = pq_valid.css,
					cls = pq_valid.cls,
					icon = pq_valid.icon,
					style = pq_valid.style
			} else {
				if (that.data({
						rowData: rowData,
						dataIndx: dataIndx,
						data: "pq_valid"
					})) {
					that.removeClass({
						rowData: rowData,
						rowIndx: rowIndx,
						dataIndx: dataIndx,
						cls: warnClass + " " + errorClass
					});
					that.removeData({
						rowData: rowData,
						dataIndx: dataIndx,
						data: "pq_valid"
					})
				}
			}
			if (allowInvalid || warn) {
				if (!_valid) {
					that.addClass({
						rowData: rowData,
						rowIndx: rowIndx,
						dataIndx: dataIndx,
						cls: warn ? warnClass : errorClass
					});
					that.data({
						rowData: rowData,
						dataIndx: dataIndx,
						data: {
							pq_valid: {
								css: css,
								icon: icon,
								style: style,
								msg: msg,
								cls: cls
							}
						}
					});
					return objvalid
				} else {
					return {
						valid: true
					}
				}
			} else {
				if (!_valid) {
					if (rowIndx == null) {
						var objR = that.getRowIndx({
								rowData: rowData,
								dataUF: true
							}),
							rowIndx = objR.rowIndx;
						if (rowIndx == null || objR.uf) {
							objvalid.uf = objR.uf;
							return objvalid
						}
					}
					if (focusInvalid) {
						var $td;
						if (!valueDef) {
							that.goToPage({
								rowIndx: rowIndx
							});
							var uin = {
									rowIndx: rowIndx,
									dataIndx: dataIndx
								},
								uin = that.normalize(uin);
							$td = that.getCell(uin);
							that.scrollCell(uin, function() {
								self.onScrollCell($td, msg, icon, cls, css, style);
								that.focus(uin)
							})
						} else {
							if ($(ae).hasClass("pq-editor-focus")) {
								var indices = o.editModel.indices;
								if (indices) {
									var rowIndx2 = indices.rowIndx,
										dataIndx2 = indices.dataIndx;
									if (rowIndx != null && rowIndx != rowIndx2) {
										throw "incorrect usage of isValid rowIndx: " + rowIndx
									}
									if (dataIndx != dataIndx2) {
										throw "incorrect usage of isValid dataIndx: " + dataIndx
									}
									that.editCell({
										rowIndx: rowIndx2,
										dataIndx: dataIndx
									})
								}
							}
						}
						this.onScrollCell($td, msg, icon, cls, css, style)
					}
					return objvalid
				}
				if (valueDef) {
					var cell = that.getEditCell();
					if (cell && cell.$cell) {
						var $cell = cell.$cell;
						$cell.removeAttr("title");
						try {
							$cell.tooltip("destroy")
						} catch (ex) {}
					}
				}
				return {
					valid: true
				}
			}
		},
		isValid: function(objP) {
			objP = objP || {};
			var that = this.that,
				allowInvalid = objP.allowInvalid,
				focusInvalid = objP.focusInvalid,
				checkEditable = objP.checkEditable,
				allowInvalid = allowInvalid == null ? false : allowInvalid,
				dataIndx = objP.dataIndx;
			if (dataIndx != null) {
				var column = that.columns[dataIndx],
					rowData = objP.rowData || that.getRowData(objP),
					valueDef = objP.hasOwnProperty("value"),
					value = valueDef ? objP.value : rowData[dataIndx],
					objValid = this.isValidCell({
						rowData: rowData,
						checkEditable: checkEditable,
						rowIndx: objP.rowIndx,
						value: value,
						valueDef: valueDef,
						column: column,
						allowInvalid: allowInvalid,
						focusInvalid: focusInvalid
					});
				if (!objValid.valid && !objValid.warn) {
					return objValid
				} else {
					return {
						valid: true
					}
				}
			} else if (objP.rowIndx != null || objP.rowIndxPage != null || objP.rowData != null) {
				var rowData = objP.rowData || that.getRowData(objP),
					CM = that.colModel,
					cells = [],
					warncells = [];
				for (var i = 0, len = CM.length; i < len; i++) {
					var column = CM[i],
						hidden = column.hidden;
					if (hidden) {
						continue
					}
					var dataIndx = column.dataIndx,
						value = rowData[dataIndx],
						objValid = this.isValidCell({
							rowData: rowData,
							value: value,
							column: column,
							rowIndx: objP.rowIndx,
							checkEditable: checkEditable,
							allowInvalid: allowInvalid,
							focusInvalid: focusInvalid
						});
					if (!objValid.valid && !objValid.warn) {
						if (allowInvalid) {
							cells.push({
								rowData: rowData,
								dataIndx: dataIndx,
								column: column
							})
						} else {
							return objValid
						}
					}
				}
				if (allowInvalid && cells.length) {
					return {
						cells: cells,
						valid: false
					}
				} else {
					return {
						valid: true
					}
				}
			} else {
				var data = objP.data ? objP.data : that.options.dataModel.data,
					cells = [];
				if (!data) {
					return null
				}
				for (var i = 0, len = data.length; i < len; i++) {
					var rowData = data[i],
						rowIndx;
					var objRet = this.isValid({
						rowData: rowData,
						rowIndx: rowIndx,
						checkEditable: checkEditable,
						allowInvalid: allowInvalid,
						focusInvalid: focusInvalid
					});
					var objRet_cells = objRet.cells;
					if (allowInvalid === false) {
						if (!objRet.valid) {
							return objRet
						}
					} else if (objRet_cells && objRet_cells.length) {
						cells = cells.concat(objRet_cells)
					}
				}
				if (allowInvalid && cells.length) {
					return {
						cells: cells,
						valid: false
					}
				} else {
					return {
						valid: true
					}
				}
			}
		}
	}
})(jQuery);
(function($) {
	var fnPG = {};
	fnPG.options = {
		curPage: 0,
		totalPages: 0,
		totalRecords: 0,
		msg: "",
		rPPOptions: [10, 20, 30, 40, 50, 100],
		rPP: 20,
		layout: ["first", "prev", "|", "strPage", "|", "next", "last", "|", "strRpp", "|", "refresh", "|", "strDisplay"]
	};
	fnPG._create = function() {
		var that = this,
			options = that.options,
			rtl = options.rtl,
			$ele = that.element,
			outlineMap = {
				first: that.initButton(options.strFirstPage, "seek-" + (rtl ? "end" : "first"), "first"),
				"|": "<td><span class='pq-separator'></span></td>",
				next: that.initButton(options.strNextPage, "seek-" + (rtl ? "prev" : "next"), "next"),
				prev: that.initButton(options.strPrevPage, "seek-" + (rtl ? "next" : "prev"), "prev"),
				last: that.initButton(options.strLastPage, "seek-" + (rtl ? "first" : "end"), "last"),
				strPage: that.getPageOf(),
				strRpp: that.getRppOptions(),
				refresh: that.initButton(options.strRefresh, "refresh", "refresh"),
				strDisplay: "<td><span class='pq-page-display'>" + that.getDisplay() + "</span></td>"
			},
			template = options.layout.map(function(key) {
				return outlineMap[key]
			}).join("");
		that.listeners = {};
		$ele.html("<table style='border-collapse:collapse;'><tr>" + template + "</tr></table>");
		$ele.addClass("pq-pager");
		that.$first = $ele.find(".pq-page-first");
		that.bindButton(that.$first, function(evt) {
			if (options.curPage > 1) {
				that.onChange(evt, 1)
			}
		});
		that.$prev = $ele.find(".pq-page-prev");
		that.bindButton(that.$prev, function(evt) {
			if (options.curPage > 1) {
				var curPage = options.curPage - 1;
				that.onChange(evt, curPage)
			}
		});
		that.$next = $ele.find(".pq-page-next");
		that.bindButton(that.$next, function(evt) {
			if (options.curPage < options.totalPages) {
				var val = options.curPage + 1;
				that.onChange(evt, val)
			}
		});
		that.$last = $ele.find(".pq-page-last");
		that.bindButton(that.$last, function(evt) {
			if (options.curPage !== options.totalPages) {
				var val = options.totalPages;
				that.onChange(evt, val)
			}
		});
		that.$refresh = $ele.find(".pq-page-refresh");
		that.bindButton(that.$refresh, function(evt) {
			if (that._trigger("beforeRefresh", evt) === false) {
				return false
			}
			that._trigger("refresh", evt)
		});
		that.$display = $ele.find(".pq-page-display");
		that.$select = $ele.find(".pq-page-select").val(options.rPP).on("change", that.onChangeSelect.bind(that));
		that.$totalPages = $ele.find(".pq-page-total");
		that.$curPage = $ele.find(".pq-page-current");
		that.bindCurPage(that.$curPage)
	};
	fnPG._destroy = function() {
		this.element.empty().removeClass("pq-pager").enableSelection();
		this._trigger("destroy")
	};
	fnPG._setOption = function(key, value) {
		if (key == "curPage" || key == "totalPages") {
			value = value * 1
		}
		this._super(key, value)
	};
	fnPG._setOptions = function(options) {
		var key, refresh = false,
			o = this.options;
		for (key in options) {
			var value = options[key],
				type = typeof value;
			if (type == "string" || type == "number") {
				if (value != o[key]) {
					this._setOption(key, value);
					refresh = true
				}
			} else if (typeof value.splice == "function" || $.isPlainObject(value)) {
				if (JSON.stringify(value) != JSON.stringify(o[key])) {
					this._setOption(key, value);
					refresh = true
				}
			} else {
				if (value != o[key]) {
					this._setOption(key, value);
					refresh = true
				}
			}
		}
		if (refresh) {
			this._refresh()
		}
		return this
	};
	$.widget("paramquery.pqPager", fnPG);
	pq.pager = function(selector, options) {
		var $p = $(selector).pqPager(options),
			p = $p.data("paramqueryPqPager") || $p.data("paramquery-pqPager");
		return p
	};
	var _pq = $.paramquery,
		pqPager = _pq.pqPager;
	pqPager.regional = {};
	pqPager.defaults = pqPager.prototype.options;
	$.extend(pqPager.prototype, {
		bindButton: function($ele, fn) {
			$ele.bind("click keydown", function(evt) {
				if (evt.type == "keydown" && evt.keyCode != $.ui.keyCode.ENTER) {
					return
				}
				return fn.call(this, evt)
			})
		},
		bindCurPage: function($inp) {
			var that = this,
				options = this.options;
			$inp.bind("keydown", function(evt) {
				if (evt.keyCode === $.ui.keyCode.ENTER) {
					$(this).trigger("change")
				}
			}).bind("change", function(evt) {
				var $this = $(this),
					val = $this.val();
				if (isNaN(val) || val < 1) {
					$this.val(options.curPage);
					return false
				}
				val = parseInt(val);
				if (val === options.curPage) {
					return
				}
				if (val > options.totalPages) {
					$this.val(options.curPage);
					return false
				}
				if (that.onChange(evt, val) === false) {
					$this.val(options.curPage);
					return false
				}
			})
		},
		initButton: function(str, icon, cls) {
			return "<td><span class='pq-ui-button ui-widget-header pq-page-" + cls + "' tabindex='0' title='" + str + "'>" + "<span class='ui-icon ui-icon-" + icon + "'></span></span></td>"
		},
		onChange: function(evt, val) {
			var ui = {
				curPage: val
			};
			if (this._trigger("beforeChange", evt, ui) === false) {
				return false
			}
			this.options.curPage = val;
			this._trigger("change", evt, ui)
		},
		onChangeSelect: function(evt) {
			var $select = $(evt.target),
				that = this,
				val = $select.val() * 1,
				ui = {
					rPP: val
				};
			if (that._trigger("beforeChange", evt, ui) === false) {
				$select.val(that.options.rPP);
				return false
			}
			that.options.rPP = val;
			that._trigger("change", evt, ui)
		},
		refresh: function() {
			this._destroy();
			this._create()
		},
		format: function(o) {
			var format = o.format;
			return function(val) {
				return format ? pq.formatNumber(val, format) : val
			}
		},
		_refresh: function() {
			var that = this,
				options = that.options,
				isDisabled = options.curPage >= options.totalPages;
			that.setDisable(that.$next, isDisabled);
			that.setDisable(that.$last, isDisabled);
			isDisabled = options.curPage <= 1;
			that.setDisable(that.$first, isDisabled);
			that.setDisable(that.$prev, isDisabled);
			that.$totalPages.text(that.format(options)(options.totalPages));
			that.$curPage.val(options.curPage);
			that.$select.val(options.rPP);
			that.$display.html(this.getDisplay());
			that._trigger("refreshView")
		},
		getDisplay: function() {
			var options = this.options,
				formatFn = this.format(options);
			if (options.totalRecords > 0) {
				var rPP = options.rPP,
					strDisplay = options.strDisplay || "",
					curPage = options.curPage,
					totalRecords = options.totalRecords,
					begIndx = (curPage - 1) * rPP,
					endIndx = curPage * rPP;
				if (endIndx > totalRecords) {
					endIndx = totalRecords
				}
				strDisplay = strDisplay.replace("{0}", formatFn(begIndx + 1));
				strDisplay = strDisplay.replace("{1}", formatFn(endIndx));
				strDisplay = strDisplay.replace("{2}", formatFn(totalRecords))
			} else {
				strDisplay = ""
			}
			return strDisplay
		},
		getPageOf: function() {
			var options = this.options;
			return "<td><span>" + (options.strPage || "").replace("{0}", "<input type='text' value='" + options.curPage + "' tabindex='0' class='pq-page-current ui-corner-all' />").replace("{1}", "<span class='pq-page-total'>" + this.format(options)(options.totalPages) + "</span>") + "</span></td>"
		},
		getRppOptions: function() {
			var options = this.options,
				opts = options.rPPOptions,
				i = 0,
				len = opts.length,
				format = this.format(options),
				key, val, opt, selectStr, selectArr, strRpp = options.strRpp || "";
			if (strRpp && strRpp.indexOf("{0}") != -1) {
				selectArr = ["<select class='ui-corner-all pq-page-select' >"];
				for (; i < len; i++) {
					opt = opts[i];
					if (opt * 1 == opt) val = format(key = opt);
					else {
						key = Object.keys(opt)[0];
						val = opt[key]
					}
					selectArr.push('<option value="', key, '">', val, "</option>")
				}
				selectArr.push("</select>");
				selectStr = selectArr.join("");
				strRpp = strRpp.replace("{0}", selectStr) + "</span>"
			}
			return "<td><span class='pq-page-rppoptions'>" + strRpp + "</span></td>"
		},
		getInstance: function() {
			return {
				pager: this
			}
		},
		_trigger: _pq._trigger,
		on: _pq.on,
		one: _pq.one,
		off: _pq.off,
		setDisable: function($btn, disabled) {
			$btn[disabled ? "addClass" : "removeClass"]("disabled").css("pointer-events", disabled ? "none" : "").attr("tabindex", disabled ? "" : "0")
		}
	})
})(jQuery);
(function($) {
	var cClass = function() {};
	cClass.prototype = {
		belongs: function(evt) {
			if (evt.target == this.that.element[0]) {
				return true
			}
		},
		setTimer: function(fn, interval) {
			var self = this;
			clearTimeout(self._timeID);
			self._timeID = setTimeout(function() {
				fn()
			}, interval)
		}
	};
	var _pq = $.paramquery;
	_pq.cClass = cClass;
	var fni = {
		widgetEventPrefix: "pqgrid"
	};
	fni._createWidget = function(options, element) {
		this.origOptions = options;
		$(document).triggerHandler("pq:ready");
		return $.Widget.prototype._createWidget.apply(this, arguments)
	};
	fni._create = function() {
		var that = this,
			o = that.options,
			element = that.element,
			eventNamespace = that.eventNamespace,
			bts = o.bootstrap,
			bts_on = bts.on,
			roundCorners = o.roundCorners && !bts_on,
			summaryOnTop = o.summaryOnTop,
			summaryContainer = "<div class='pq-summary-outer' ></div>",
			jui = o.ui;
		$(document).triggerHandler("pqGrid:bootup", {
			instance: this
		});
		that.BS_on = bts_on;
		if (!o.collapsible) {
			o.collapsible = {
				on: false,
				collapsed: false
			}
		}
		if (o.flexHeight) {
			o.height = "flex"
		}
		if (o.flexWidth) {
			o.width = "flex"
		}
		that.iRefresh = new _pq.cRefresh(that);
		that.iKeyNav = new _pq.cKeyNav(that);
		that.iValid = new _pq.cValid(that);
		that.tables = [];
		that.$tbl = null;
		that.iCols = new _pq.cColModel(that);
		that.iSort = new _pq.cSort(that);
		element.on("scroll" + eventNamespace, function() {
			this.scrollLeft = 0;
			this.scrollTop = 0
		}).on("mousedown" + eventNamespace, that._mouseDown.bind(that));
		var jui_grid = bts_on ? bts.grid : jui.grid,
			jui_header_o = bts_on ? "" : jui.header_o,
			jui_bottom = bts_on ? "" : jui.bottom,
			jui_top = bts_on ? bts.top : jui.top;
		element.empty().attr({
			role: "grid",
			dir: o.rtl ? "rtl" : "ltr"
		}).addClass("pq-grid pq-theme " + jui_grid + " " + (roundCorners ? " ui-corner-all" : "")).html(["<div class='pq-grid-top ", jui_top, " ", roundCorners ? " ui-corner-top" : "", "'>", "<div class='pq-grid-title", roundCorners ? " ui-corner-top" : "", "'>&nbsp;</div>", "</div>", "<div class='pq-grid-center-o'>", "<div class='pq-tool-panel' style='display:", o.toolPanel.show ? "" : "none", ";'></div>", "<div class='pq-tool-panel-rules' style='display:", o.toolPanelRules.show ? "" : "none", ";'></div>", "<div class='pq-grid-center' >", "<div class='pq-header-outer ", jui_header_o, "'></div>", summaryOnTop ? summaryContainer : "", "<div class='pq-body-outer' tabindex='0' ></div>", summaryOnTop ? "" : summaryContainer, "</div>", "<div style='clear:both;'></div>", "</div>", "<div class='pq-grid-bottom ", jui_bottom, " ", roundCorners ? " ui-corner-bottom" : "", "'>", "<div class='pq-grid-footer'></div>", "</div>"].join(""));
		that.setLocale();
		that.$bottom = $(".pq-grid-bottom", element);
		that.$summary = $(".pq-summary-outer", element);
		that.$toolPanel = element.find(".pq-tool-panel");
		that.$toolPanelRules = element.find(".pq-tool-panel-rules");
		that.$top = $("div.pq-grid-top", element);
		if (!o.showTop) {
			that.$top.css("display", "none")
		}
		that.$title = $("div.pq-grid-title", element);
		if (!o.showTitle) {
			that.$title.css("display", "none")
		}
		var $grid_center = that.$grid_center = $(".pq-grid-center", element).on("scroll", function() {
			this.scrollTop = 0
		});
		var $header = that.$header = $(".pq-header-outer", $grid_center).on("scroll", function() {
			this.scrollTop = 0;
			this.scrollLeft = 0
		});
		that.iHeader = new _pq.cHeader(that, $header);
		that.$footer = $(".pq-grid-footer", element);
		var $cont = that.$cont = $(".pq-body-outer", $grid_center);
		$grid_center.on("mousedown", that._onGCMouseDown.bind(that));
		that.iRenderB = new pq.cRenderBody(that, {
			$center: $grid_center,
			$b: $cont,
			$sum: that.$summary,
			header: true,
			$h: that.$header
		});
		that._trigger("render", null, {
			dataModel: that.options.dataModel,
			colModel: that.colModel
		});
		if ("ontouchend" in document) {
			that.addTouch();
			that.contextIOS(element)
		}
		element.on("contextmenu" + eventNamespace, that.onContext.bind(that));
		$cont.on("click", ".pq-grid-cell,.pq-grid-number-cell", function(evt) {
			if ($.data(evt.target, that.widgetName + ".preventClickEvent") === true) {
				return
			}
			if (that.evtBelongs(evt)) {
				return that._onClickCell(evt)
			}
		}).on("dblclick", ".pq-grid-cell", function(evt) {
			if (that.evtBelongs(evt)) {
				return that._onDblClickCell(evt)
			}
		});
		$cont.on("focusout", function() {
			that.onblur()
		}).on("focus", function(evt) {
			that.onfocus(evt)
		}).on("mousedown", that._onMouseDown.bind(that)).on("change", that._onChange(that)).on("mouseenter", ".pq-grid-cell,.pq-grid-number-cell", that._onCellMouseEnter(that)).on("mouseenter", ".pq-grid-row", that._onRowMouseEnter(that)).on("mouseleave", ".pq-grid-cell", that._onCellMouseLeave(that)).on("mouseleave", ".pq-grid-row", that._onRowMouseLeave(that)).on("keyup", that._onKeyUp(that));
		if (!o.selectionModel["native"]) {
			this.disableSelection()
		}
		$grid_center.bind("keydown.pq-grid", that._onKeyPressDown(that));
		this._refreshTitle();
		that.iRows = new _pq.cRows(that);
		that.generateLoading();
		that._initPager();
		that._refreshResizable();
		that._refreshDraggable();
		that.iResizeColumns = new _pq.cResizeColumns(that);
		this._mouseInit()
	};
	fni.contextIOS = function($ele) {
		var touchIOS, preventDef, evtName = "contextmenu",
			touches;
		$ele.on("touchstart", function(evt) {
			touchIOS = 1;
			setTimeout(function() {
				if (touchIOS) {
					touches = evt.originalEvent.touches;
					if (touches.length == 1) {
						var touch = touches[0],
							e = $.Event(evtName, touch);
						$(evt.target).trigger(e);
						preventDef = 1
					}
				}
			}, 600);
			$ele.one(evtName, function() {
				touchIOS = 0
			})
		}).on("touchmove touchend", function(evt) {
			touchIOS = 0;
			if (preventDef) {
				preventDef = 0;
				evt.preventDefault()
			}
		})
	};
	fni.addTouch = function() {
		var firstTap, secondTap, ele = this.$grid_center[0];
		ele.addEventListener("touchstart", function(evt) {
			var target = evt.target,
				touch = evt.changedTouches[0];
			if (!firstTap) {
				firstTap = {
					x: touch.pageX,
					y: touch.pageY,
					target: target
				};
				setTimeout(function() {
					firstTap = null
				}, 400)
			} else if (target && target == firstTap.target) {
				var x = firstTap.x - touch.pageX,
					y = firstTap.y - touch.pageY,
					dist = Math.sqrt(x * x + y * y);
				if (dist <= 12) {
					secondTap = firstTap;
					setTimeout(function() {
						secondTap = null
					}, 500)
				}
			}
		}, true);
		ele.addEventListener("touchend", function(evt) {
			var target = evt.target;
			if (secondTap && target == secondTap.target) {
				$(target).trigger("dblclick", evt)
			}
		})
	};
	fni._mouseDown = function(evt) {
		var that = this;
		if ($(evt.target).closest(".pq-editor-focus").length) {
			this._blurEditMode = true;
			window.setTimeout(function() {
				that._blurEditMode = false
			}, 0);
			return
		}
	};
	fni.destroy = function() {
		this._trigger("destroy");
		this._super();
		$(window).off("resize" + this.eventNamespace);
		for (var key in this) {
			delete this[key]
		}
		this.options = undefined;
		$.fragments = {}
	};
	fni.setLocale = function() {
		var options = this.options,
			locale = options.locale;
		if (options.strLocal != locale) {
			$.extend(true, options, _pq.pqGrid.regional[locale]);
			$.extend(options.pageModel, _pq.pqPager.regional[locale])
		}
	};
	fni._setOption = function(key, value) {
		var that = this,
			options = that.options,
			pageI = that.pageI,
			a = function() {
				options[key] = value
			},
			iRB = that.iRenderB,
			iRS = that.iRenderSum,
			iRH = that.iRenderHead,
			c = function(val) {
				return val ? "addClass" : "removeClass"
			},
			cls, DM = options.dataModel;
		if (!that.$title) {
			a();
			return that
		}
		if (key === "height") {
			a();
			that._refreshResizable()
		} else if (key == "locale" || key == "pageModel") {
			a();
			if (key == "locale") that.setLocale();
			if (pageI) pageI.destroy()
		} else if (key === "width") {
			a();
			that._refreshResizable()
		} else if (key == "title") {
			a();
			that._refreshTitle()
		} else if (key == "roundCorners") {
			a();
			var addClass = c(value);
			that.element[addClass]("ui-corner-all");
			that.$top[addClass]("ui-corner-top");
			that.$bottom[addClass]("ui-corner-bottom")
		} else if (key == "freezeCols") {
			value = parseInt(value);
			if (!isNaN(value) && value >= 0 && value <= that.colModel.length - 2) {
				a()
			}
		} else if (key == "freezeRows") {
			value = parseInt(value);
			if (!isNaN(value) && value >= 0) {
				a()
			}
		} else if (key == "resizable") {
			a();
			that._refreshResizable()
		} else if (key == "draggable") {
			a();
			that._refreshDraggable()
		} else if (key == "dataModel") {
			if (value.data !== DM.data) {
				if (DM.dataUF) {
					DM.dataUF.length = 0
				}
			}
			a()
		} else if (key == "groupModel") {
			throw "use groupOption() to set groupModel options."
		} else if (key == "treeModel") {
			throw "use treeOption() to set treeModel options."
		} else if (key === "colModel" || key == "columnTemplate") {
			a();
			that.iCols.init()
		} else if (key === "disabled") {
			that._super(key, value);
			if (value === true) {
				that._disable()
			} else {
				that._enable()
			}
		} else if (key === "strLoading") {
			a();
			that._refreshLoadingString()
		} else if (key === "showTop") {
			a();
			that.$top.css("display", value ? "" : "none")
		} else if (key === "showTitle") {
			a();
			that.$title.css("display", value ? "" : "none")
		} else if (key === "showToolbar") {
			a();
			var $tb = that._toolbar.widget();
			$tb.css("display", value ? "" : "none")
		} else if (key === "collapsible") {
			a();
			that._createCollapse()
		} else if (key === "showBottom") {
			a();
			that.$bottom.css("display", value ? "" : "none")
		} else if (key == "wrap" || key == "hwrap") {
			a();
			(key == "wrap" ? iRB.$tbl.add(iRS.$tbl) : iRH.$tbl)[c(!value)]("pq-no-wrap")
		} else if (key === "rowBorders") {
			a();
			addClass = c(value);
			cls = "pq-td-border-top";
			iRB.$tbl[addClass](cls);
			iRS.$tbl[addClass](cls)
		} else if (key === "columnBorders") {
			a();
			addClass = c(value);
			cls = "pq-td-border-right";
			iRB.$tbl[addClass](cls);
			iRS.$tbl[addClass](cls)
		} else if (key === "strNoRows") {
			a();
			that.$cont.find(".pq-grid-norows").text(value)
		} else {
			a()
		}
		return that
	};
	fni.options = {
		cancel: "input,textarea,button,select,option,.pq-no-capture,.ui-resizable-handle",
		trigger: false,
		bootstrap: {
			on: false,
			thead: "table table-striped table-condensed table-bordered",
			tbody: "table table-condensed",
			grid: "panel panel-default",
			top: "",
			btn: "btn btn-default",
			groupModel: {
				icon: ["glyphicon-triangle-bottom", "glyphicon-triangle-right"]
			},
			header_active: "active"
		},
		ui: {
			on: true,
			grid: "ui-widget ui-widget-content",
			top: "ui-widget-header",
			bottom: "ui-widget-header",
			header_o: "ui-widget-header",
			header: "ui-state-default",
			header_active: ""
		},
		format: function(rd, col, cellprop, rowprop) {
			var key = "format";
			return cellprop[key] || rowprop[key] || col[key]
		},
		cellDatatype: function(rd, col) {
			return col.dataType
		},
		collapsible: {
			on: true,
			toggle: true,
			collapsed: false,
			_collapsed: false,
			refreshAfterExpand: true,
			css: {
				zIndex: 1e3
			}
		},
		colModel: null,
		columnBorders: true,
		dataModel: {
			data: [],
			dataUF: [],
			cache: false,
			dataType: "JSON",
			location: "local",
			sorting: "local",
			sortDir: "up",
			method: "GET"
		},
		direction: "",
		draggable: false,
		editable: true,
		editModel: {
			pressToEdit: true,
			charsAllow: ["0123456789.-=eE+", "0123456789-=eE+"],
			clicksToEdit: 2,
			filterKeys: true,
			reInt: /^([-]?[1-9][0-9]*|[-]?[0-9]?)(e[-+]?)?[0-9]*$/i,
			reFloat: /^[-]?[0-9]*\.?[0-9]*(e[-+]?)?[0-9]*$/i,
			onBlur: "validate",
			saveKey: $.ui.keyCode.ENTER,
			onSave: "nextFocus",
			onTab: "nextFocus",
			allowInvalid: false,
			invalidClass: "pq-cell-red-tr pq-has-tooltip",
			warnClass: "pq-cell-blue-tr pq-has-tooltip",
			validate: true
		},
		editor: {
			select: false,
			type: "textarea"
		},
		summaryOptions: {
			number: "avg,max,min,stdev,stdevp,sum",
			date: "count,max,min",
			string: "count"
		},
		summaryTitle: {
			avg: "Avg: {0}",
			count: "Count: {0}",
			max: "Max: {0}",
			min: "Min: {0}",
			stdev: "Stdev: {0}",
			stdevp: "Stdevp: {0}",
			sum: "Sum: {0}"
		},
		validation: {
			icon: "ui-icon-alert",
			cls: "ui-state-error",
			style: "padding:3px 10px;"
		},
		warning: {
			icon: "ui-icon-info",
			cls: "",
			style: "padding:3px 10px;"
		},
		freezeCols: 0,
		freezeRows: 0,
		freezeBorders: true,
		calcDataIndxFromColIndx: true,
		height: 400,
		hoverMode: "null",
		locale: "en",
		maxColWidth: 2e3,
		minColWidth: 50,
		minWidth: 100,
		menuUI: {
			tabs: ["hideCols", "filter"],
			buttons: ["clear", "ok"],
			gridOptions: {
				autoRow: false,
				copyModel: {
					render: true
				},
				editable: function(ui) {
					return !ui.rowData.pq_disabled
				},
				fillHandle: "",
				filterModel: {
					header: true,
					on: true
				},
				hoverMode: "row",
				hwrap: false,
				rowBorders: false,
				rowHt: 24,
				rowHtHead: 23,
				scrollModel: {
					autoFit: true
				},
				showTop: false,
				height: 300,
				wrap: false
			}
		},
		mergeCells: [],
		numberCell: {
			width: 30,
			title: "",
			resizable: true,
			minWidth: 30,
			maxWidth: 100,
			show: true
		},
		pageModel: {
			curPage: 1,
			totalPages: 0,
			rPP: 10,
			rPPOptions: [10, 20, 50, 100]
		},
		resizable: false,
		roundCorners: true,
		rowBorders: true,
		rowResize: true,
		autoRow: true,
		scrollModel: {
			autoFit: false
		},
		selectionModel: {
			column: true,
			type: "cell",
			onTab: "nextFocus",
			row: true,
			mode: "block"
		},
		showBottom: true,
		showHeader: true,
		showTitle: true,
		showToolbar: true,
		showTop: true,
		sortable: true,
		sql: false,
		stringify: true,
		stripeRows: true,
		title: "&nbsp;",
		toolPanelRules: {},
		treeModel: null,
		width: "auto",
		wrap: true,
		hwrap: true
	};
	$.widget("paramquery._pqGrid", $.ui.mouse, fni);
	var fn = _pq._pqGrid.prototype;
	fn.setData = function(data) {
		var that = this,
			o = that.options,
			pivot = o.groupModel.pivot,
			reactive = o.reactive,
			G = that.Group();
		if (pivot) G.option({
			pivot: false
		});
		that.option("dataModel.data", data);
		if (!reactive) that.refreshDataAndView();
		if (pivot) G.option({
			pivot: true
		})
	};
	fn.refreshCM = function(CM, ui) {
		if (CM) {
			this.options.colModel = CM
		}
		this.iCols.init(ui)
	};
	fn.evtBelongs = function(evt) {
		return $(evt.target).closest(".pq-grid")[0] == this.element[0]
	};
	fn.readCell = function(rowData, column, iMerge, ri, ci) {
		if (iMerge && iMerge.isRootCell(ri, ci, "o") === false) {
			return undefined
		}
		return rowData[column.dataIndx]
	};
	fn.saveCell = function(rowData, column, val) {
		var dataIndx = column.dataIndx;
		rowData[dataIndx] = val
	};
	fn._destroyResizable = function() {
		var ele = this.element,
			data = ele.data();
		if (data.resizable || data.uiResizable || data["ui-resizable"]) {
			ele.resizable("destroy")
		}
	};
	fn._disable = function() {
		if (this.$disable == null) this.$disable = $("<div class='pq-grid-disable'></div>").css("opacity", .2).appendTo(this.element)
	};
	fn._enable = function() {
		if (this.$disable) {
			this.element[0].removeChild(this.$disable[0]);
			this.$disable = null
		}
	};
	fn._destroy = function() {
		var eventNamespace = this.eventNamespace;
		if (this.loading) {
			this.xhr.abort()
		}
		this._destroyResizable();
		this._destroyDraggable();
		this.element.off(eventNamespace);
		$(window).unbind(eventNamespace);
		$(document).unbind(eventNamespace);
		this.element.empty().css("height", "").css("width", "").removeClass("pq-grid ui-widget ui-widget-content ui-corner-all").removeData()
	};
	fn._onKeyUp = function(that) {
		return function(evt) {
			if (that.evtBelongs(evt)) {
				that._trigger("keyUp", evt, null)
			}
		}
	};
	fn.onKeyPressDown = function(evt) {
		var that = this,
			$header = $(evt.target).closest(".pq-header-outer");
		if ($header.length) {
			return that._trigger("headerKeyDown", evt, null)
		} else {
			if (that.iKeyNav.bodyKeyPressDown(evt) === false) {
				return
			}
			if (that._trigger("keyDown", evt, null) == false) {
				return
			}
		}
	};
	fn._onKeyPressDown = function(that) {
		return function(evt) {
			if (that.evtBelongs(evt)) {
				that.onKeyPressDown(evt, that)
			}
		}
	};
	fn.collapse = function(objP) {
		objP = objP || {};
		var that = this,
			ele = that.element,
			o = that.options,
			CP = o.collapsible,
			$icon = CP.$collapse.children("span"),
			postCollapse = function() {
				ele.css("overflow", "hidden");
				$icon.addClass("ui-icon-circle-triangle-s").removeClass("ui-icon-circle-triangle-n");
				if (ele.hasClass("ui-resizable")) {
					ele.resizable("destroy")
				}
				if (that._toolbar) that._toolbar.disable();
				CP.collapsed = CP._collapsed = true;
				CP.animating = false;
				that._trigger("collapse")
			};
		if (CP._collapsed) {
			return false
		}
		CP.htCapture = ele.height();
		if (objP.animate === false) {
			ele.height(23);
			postCollapse()
		} else {
			CP.animating = true;
			that.disable();
			ele.animate({
				height: "23px"
			}, function() {
				postCollapse()
			})
		}
	};
	fn.expand = function(objP) {
		var that = this,
			ele = that.element,
			o = that.options,
			CP = o.collapsible,
			htCapture = CP.htCapture,
			$icon = CP.$collapse.children("span"),
			postExpand = function() {
				ele.css("overflow", "");
				CP._collapsed = CP.collapsed = false;
				that._refreshResizable();
				if (CP.refreshAfterExpand) {
					that.refresh()
				}
				$icon.addClass("ui-icon-circle-triangle-n").removeClass("ui-icon-circle-triangle-s");
				if (that._toolbar) that._toolbar.enable();
				that.enable();
				CP.animating = false;
				that._trigger("expand")
			};
		objP = objP ? objP : {};
		if (CP._collapsed === false) {
			return false
		}
		if (objP.animate === false) {
			ele.height(htCapture);
			postExpand()
		} else {
			CP.animating = true;
			ele.animate({
				height: htCapture
			}, function() {
				postExpand()
			})
		}
	};

	function createButton(icon) {
		return "<span class='btn btn-xs glyphicon glyphicon-" + icon + "' ></span>"
	}

	function createUIButton(icon) {
		return "<span class='ui-widget-header pq-ui-button'><span class='ui-icon ui-icon-" + icon + "'></span></span>"
	}
	fn._createCollapse = function() {
		var that = this,
			$top = this.$top,
			o = this.options,
			BS_on = this.BS_on,
			CP = o.collapsible;
		if (!CP.$stripe) {
			var $stripe = $(["<div class='pq-slider-icon pq-no-capture'  >", "</div>"].join("")).appendTo($top);
			CP.$stripe = $stripe
		}
		if (CP.on) {
			if (!CP.$collapse) {
				CP.$collapse = $(BS_on ? createButton("collapse-down") : createUIButton("circle-triangle-n")).appendTo(CP.$stripe).click(function() {
					if (CP.collapsed) {
						that.expand()
					} else {
						that.collapse()
					}
				})
			}
		} else if (CP.$collapse) {
			CP.$collapse.remove();
			delete CP.$collapse
		}
		if (CP.collapsed && !CP._collapsed) {
			that.collapse({
				animate: false
			})
		} else if (!CP.collapsed && CP._collapsed) {
			that.expand({
				animate: false
			})
		}
		if (CP.toggle) {
			if (!CP.$toggle) {
				CP.$toggle = $(BS_on ? createButton("fullscreen") : createUIButton("arrow-4-diag")).prependTo(CP.$stripe).click(function() {
					that.toggle()
				})
			}
		} else if (CP.$toggle) {
			CP.$toggle.remove();
			delete CP.$toggle
		}
		if (CP.toggled && !CP.state) {
			this.toggle()
		}
	};
	fn.toggle = function(ui) {
		ui = ui || {};
		var o = this.options,
			CP = o.collapsible,
			$grid = this.element,
			maxim = CP.state,
			state = maxim ? "min" : "max",
			$html = $("html"),
			$win = $(window),
			$doc = $(document.body);
		if (this._trigger("beforeToggle", null, {
				state: state
			}) === false) {
			return false
		}
		if (state == "min") {
			var eleObj = maxim.grid,
				docObj = maxim.doc;
			this.option({
				height: eleObj.height,
				width: eleObj.width,
				maxHeight: eleObj.maxHeight,
				maxWidth: eleObj.maxWidth
			});
			$grid[0].style.cssText = eleObj.cssText;
			$doc[0].style.cssText = docObj.cssText;
			$html.css({
				overflow: "visible"
			});
			window.scrollTo(docObj.scrollLeft, docObj.scrollTop);
			CP.state = null
		} else {
			eleObj = {
				height: o.height,
				width: o.width,
				cssText: $grid[0].style.cssText,
				maxHeight: o.maxHeight,
				maxWidth: o.maxWidth
			};
			this.option({
				height: "100%",
				width: "100%",
				maxHeight: null,
				maxWidth: null
			});
			$grid.css($.extend({
				position: "fixed",
				left: 0,
				top: 0,
				margin: 0
			}, CP.css));
			docObj = {
				scrollLeft: $win.scrollLeft(),
				scrollTop: $win.scrollTop(),
				cssText: $doc[0].style.cssText
			};
			$doc.css({
				height: 0,
				width: 0,
				overflow: "hidden",
				position: "static"
			});
			$html.css({
				overflow: "hidden"
			});
			window.scrollTo(0, 0);
			CP.state = {
				grid: eleObj,
				doc: docObj
			}
		}
		CP.toggled = !!CP.state;
		if (!ui.refresh) {
			this._trigger("toggle", null, {
				state: state
			});
			this._refreshResizable();
			this.refresh();
			$win.trigger("resize", {
				$grid: $grid,
				state: state
			})
		}
	};
	fn._onDblClickCell = function(evt) {
		var that = this,
			$td = $(evt.currentTarget),
			obj = that.getCellIndices({
				$td: $td
			});
		obj.$td = $td;
		if (that._trigger("cellDblClick", evt, obj) == false) {
			return
		}
		if (that.options.editModel.clicksToEdit > 1 && that.isEditable(obj)) {
			that.editCell(obj)
		}
		obj.$tr = $td.closest(".pq-grid-row");
		that._trigger("rowDblClick", evt, obj)
	};
	fn.getValueFromDataType = function(val, dataType, validation) {
		if ((val + "")[0] == "=") {
			return val
		}
		var val2;
		if (dataType == "date") {
			val2 = Date.parse(val);
			if (isNaN(val2)) {
				return
			} else {
				if (validation) {
					return val2
				} else {
					return val
				}
			}
		} else if (dataType == "integer") {
			val2 = parseInt(val)
		} else if (dataType == "float") {
			val2 = parseFloat(val)
		} else if (dataType == "bool") {
			if (val == null) {
				return val
			}
			val2 = $.trim(val).toLowerCase();
			if (val2.length == 0) {
				return null
			}
			if (val2 == "true" || val2 == "yes" || val2 == "1") {
				return true
			} else if (val2 == "false" || val2 == "no" || val2 == "0") {
				return false
			} else {
				return Boolean(val2)
			}
		} else if (dataType == "object") {
			return val
		} else {
			return val == null ? val : $.trim(val)
		}
		if (isNaN(val2) || val2 == null) {
			if (val == null) {
				return val
			} else {
				return null
			}
		} else {
			return val2
		}
	};
	fn.isValid = function(objP) {
		return this.iValid.isValid(objP)
	};
	fn.isValidChange = function(ui) {
		ui = ui || {};
		var changes = this.getChanges(),
			al = changes.addList,
			ul = changes.updateList,
			list = ul.concat(al);
		ui.data = list;
		return this.isValid(ui)
	};
	fn.isEditableCell = function(ui) {
		var objP = ui,
			cEditable, ret, ebcell, rd = ui.rowData;
		if (!ui.column || !rd) {
			objP = this.normalize(ui);
			rd = objP.rowData
		}
		if (rd && (ebcell = rd.pq_cellprop)) ret = (ebcell[objP.dataIndx] || {}).edit;
		if (ret == null && (cEditable = objP.column.editable) != null) {
			if (typeof cEditable == "function") {
				objP = objP || this.normalize(ui);
				ret = this.callFn(cEditable, objP)
			} else ret = cEditable
		}
		return ret
	};
	fn.isEditableRow = function(objP) {
		var g = this.options.editable,
			rd = objP.rowData,
			ret = rd && (rd.pq_rowprop || {}).edit;
		if (ret == null) ret = typeof g == "function" ? g.call(this, this.normalize(objP)) : g;
		return ret
	};
	fn.isEditable = function(ui) {
		var ret = this.isEditableCell(ui);
		return ret == null ? this.isEditableRow(ui) : ret
	};
	fn._onMouseDownCont = function() {
		var that = this,
			pdata, cont;
		pdata = that.pdata;
		if (!pdata || !pdata.length) {
			cont = that.$cont[0];
			cont.setAttribute("tabindex", 0);
			cont.focus()
		}
	};
	fn._onGCMouseDown = function() {
		var that = this;
		that._mousePQUpDelegate = function(evt) {
			$(document).unbind("mouseup" + that.eventNamespace, that._mousePQUpDelegate);
			that._trigger("mousePQUp", evt, null)
		};
		$(document).bind("mouseup" + that.eventNamespace, that._mousePQUpDelegate)
	};
	fn._onMouseDown = function(evt) {
		var that = this;
		if ((!evt.which || evt.which == 1) && that.evtBelongs(evt)) {
			var $target = $(evt.target),
				$tr, $td = $target.closest(".pq-grid-cell,.pq-grid-number-cell");
			if ($target.is("a")) {
				return
			}
			if ($td.length) {
				evt.currentTarget = $td[0];
				that._onMouseDownCell(evt)
			}
			if (evt.isPropagationStopped()) {
				return
			}
			$tr = $target.closest(".pq-grid-row");
			if ($tr.length) {
				evt.currentTarget = $tr[0];
				that._onMouseDownRow(evt)
			}
			if (evt.isPropagationStopped()) {
				return
			}
			that._onMouseDownCont(evt)
		}
	};
	fn._onMouseDownCell = function(evt) {
		var that = this,
			$td = $(evt.currentTarget),
			_obj = that.getCellIndices({
				$td: $td
			}),
			objP;
		if (_obj.rowIndx != null) {
			objP = this.iMerge.getRootCellO(_obj.rowIndx, _obj.colIndx, true);
			objP.$td = $td;
			that._trigger("cellMouseDown", evt, objP)
		}
	};
	fn._onMouseDownRow = function(evt) {
		var that = this,
			$tr = $(evt.currentTarget),
			objP = that.getRowIndx({
				$tr: $tr
			});
		objP.$tr = $tr;
		that._trigger("rowMouseDown", evt, objP)
	};
	fn._onCellMouseEnter = function(that) {
		return function(evt) {
			if (that.evtBelongs(evt)) {
				var $td = $(this),
					o = that.options,
					objP = that.getCellIndices({
						$td: $td
					});
				if (objP.rowIndx == null || objP.colIndx == null) {
					return
				}
				if (that._trigger("cellMouseEnter", evt, objP) === false) {
					return
				}
				if (o.hoverMode == "cell") {
					that.highlightCell($td)
				}
				return true
			}
		}
	};
	fn._onChange = function(that) {
		var clickEvt, changeEvt, ui;
		that.on("cellClickDone", function(evt) {
			clickEvt = evt.originalEvent;
			triggerEvt()
		});

		function triggerEvt() {
			if (clickEvt && changeEvt && changeEvt.target == clickEvt.target) {
				var key, keys = {
					ctrlKey: 0,
					metaKey: 0,
					shiftKey: 0,
					altKey: 0
				};
				for (key in keys) {
					changeEvt[key] = clickEvt[key]
				}
				that._trigger("valChange", changeEvt, ui);
				changeEvt = clickEvt = undefined
			}
		}
		return function(evt) {
			if (that.evtBelongs(evt)) {
				var $inp = $(evt.target),
					$td = $inp.closest(".pq-grid-cell");
				if ($td.length) {
					ui = that.getCellIndices({
						$td: $td
					});
					ui = that.normalize(ui);
					ui.input = $inp[0];
					changeEvt = evt;
					triggerEvt()
				}
			}
		}
	};
	fn._onRowMouseEnter = function(that) {
		return function(evt) {
			if (that.evtBelongs(evt)) {
				var $tr = $(this),
					o = that.options,
					objRI = that.getRowIndx({
						$tr: $tr
					}),
					rowIndxPage = objRI.rowIndxPage;
				if (that._trigger("rowMouseEnter", evt, objRI) === false) {
					return
				}
				if (o.hoverMode == "row") {
					that.highlightRow(rowIndxPage)
				}
				return true
			}
		}
	};
	fn._onCellMouseLeave = function(that) {
		return function(evt) {
			if (that.evtBelongs(evt)) {
				var $td = $(this);
				if (that.options.hoverMode == "cell") {
					that.unHighlightCell($td)
				}
			}
		}
	};
	fn._onRowMouseLeave = function(that) {
		return function(evt) {
			if (that.evtBelongs(evt)) {
				var $tr = $(this),
					obj = that.getRowIndx({
						$tr: $tr
					}),
					rowIndxPage = obj.rowIndxPage;
				if (that._trigger("rowMouseLeave", evt, {
						$tr: $tr,
						rowIndx: obj.rowIndx,
						rowIndxPage: rowIndxPage
					}) === false) {
					return
				}
				if (that.options.hoverMode == "row") {
					that.unHighlightRow(rowIndxPage)
				}
			}
		}
	};
	fn.enableSelection = function() {
		this.element.removeClass("pq-disable-select").off("selectstart" + this.eventNamespace)
	};
	fn.disableSelection = function() {
		this.element.addClass("pq-disable-select").on("selectstart" + this.eventNamespace, function(evt) {
			var target = evt.target;
			if (!target) {
				return
			}
			var $target = $(evt.target);
			if ($target.is("input,textarea,select")) {
				return true
			} else if ($target.closest(".pq-native-select").length) {
				return true
			} else {
				evt.preventDefault()
			}
		})
	};
	fn._onClickCell = function(evt) {
		var that = this,
			o = that.options,
			EM = o.editModel,
			$td = $(evt.currentTarget),
			__obj = that.getCellIndices({
				$td: $td
			}),
			objP = that.normalize(__obj),
			colIndx = objP.colIndx;
		objP.$td = $td;
		objP.evt = evt;
		if (that._trigger("beforeCellClick", evt, objP) == false) {
			return
		}
		that._trigger("cellClick", evt, objP);
		if (colIndx == null || colIndx < 0) {
			return
		}
		if (EM.clicksToEdit == 1 && that.isEditable(objP)) {
			that.editCell(objP)
		}
		objP.$tr = $td.closest(".pq-grid-row");
		that._trigger("rowClick", evt, objP)
	};
	fn.getHeadIndices = function(th) {
		var self = this,
			arr = self.iRenderB.getCellIndx(th),
			ri = arr[0],
			ci = arr[1],
			hc = self.headerCells,
			row = hc[ri] || hc[ri - 1],
			col = row[ci],
			obj = {
				ri: ri,
				colIndx: ci,
				column: col,
				filterRow: !hc[ri]
			};
		return obj
	};
	fn.onContext = function(evt) {
		var self = this,
			target = evt.target,
			found, parent, $parent, obj, trigger = function(evtName) {
				self._trigger(evtName, evt, obj)
			};
		if (self.evtBelongs(evt)) {
			parent = target;
			do {
				$parent = $(parent);
				obj = {
					ele: parent
				};
				if ($parent.is(".pq-grid")) {
					obj = {};
					trigger("context");
					break
				} else if ($parent.is("img")) {
					obj.type = "img";
					found = 1
				} else if ($parent.is(".pq-grid-cell,.pq-grid-number-cell")) {
					obj = self.getCellIndices({
						$td: $parent
					});
					if (obj.rowData) {
						obj.type = obj.column ? "cell" : "num";
						obj.$td = $parent;
						found = 1;
						trigger("cellRightClick")
					}
				} else if ($parent.is(".pq-tab-item")) {
					obj.id = self.iTab.getId($parent);
					obj.type = "tab";
					found = 1
				} else if ($parent.is(".pq-grid-col")) {
					obj = self.getHeadIndices(parent);
					obj.type = "head";
					obj.$th = $parent;
					found = 1;
					trigger("headRightClick")
				}
				if (found) {
					trigger("context");
					break
				}
			} while (parent = parent.parentNode)
		}
	};
	fn.highlightCell = function($td) {
		$td.addClass("pq-grid-cell-hover ui-state-hover")
	};
	fn.unHighlightCell = function($td) {
		$td.removeClass("pq-grid-cell-hover ui-state-hover")
	};
	fn.highlightRow = function(varr) {
		if (isNaN(varr)) {} else {
			var $tr = this.getRow({
				rowIndxPage: varr
			});
			if ($tr) $tr.addClass("pq-grid-row-hover ui-state-hover")
		}
	};
	fn.unHighlightRow = function(varr) {
		if (isNaN(varr)) {} else {
			var $tr = this.getRow({
				rowIndxPage: varr
			});
			if ($tr) $tr.removeClass("pq-grid-row-hover ui-state-hover")
		}
	};
	fn._getCreateEventData = function() {
		return {
			dataModel: this.options.dataModel,
			data: this.pdata,
			colModel: this.options.colModel
		}
	};
	fn._initPager = function() {
		var that = this,
			o = that.options,
			PM = o.pageModel;
		if (PM.type) {
			var obj2 = {
				bootstrap: o.bootstrap,
				change: function(evt, ui) {
					that.blurEditor({
						force: true
					});
					var DM = that.options.pageModel;
					if (ui.curPage != undefined) {
						DM.prevPage = DM.curPage;
						DM.curPage = ui.curPage
					}
					if (ui.rPP != undefined) DM.rPP = ui.rPP;
					if (DM.type == "remote") {
						that.remoteRequest({
							callback: function() {
								that._onDataAvailable({
									apply: true,
									header: false
								})
							}
						})
					} else {
						that.refreshView({
							header: false,
							source: "pager"
						})
					}
				},
				refresh: function() {
					that.refreshDataAndView()
				}
			};
			obj2 = $.extend(obj2, PM);
			obj2.rtl = o.rtl;
			that.pageI = pq.pager(PM.appendTo ? PM.appendTo : this.$footer, obj2).on("destroy", function() {
				delete that.pageI
			})
		} else {}
	};
	fn.generateLoading = function() {
		if (this.$loading) {
			this.$loading.remove()
		}
		this.$loading = $("<div class='pq-loading'></div>").appendTo(this.element);
		$(["<div class='pq-loading-bg'></div><div class='pq-loading-mask ui-state-highlight'><div>", this.options.strLoading, "...</div></div>"].join("")).appendTo(this.$loading);
		this.$loading.find("div.pq-loading-bg").css("opacity", .2)
	};
	fn._refreshLoadingString = function() {
		this.$loading.find("div.pq-loading-mask").children("div").html(this.options.strLoading)
	};
	fn.showLoading = function() {
		if (this.showLoadingCounter == null) {
			this.showLoadingCounter = 0
		}
		this.showLoadingCounter++;
		this.$loading.show()
	};
	fn.hideLoading = function() {
		if (this.showLoadingCounter > 0) {
			this.showLoadingCounter--
		}
		if (!this.showLoadingCounter) {
			this.$loading.hide()
		}
	};
	fn.getTotalRows = function() {
		var o = this.options,
			DM = o.dataModel,
			data = DM.data || [],
			dataUF = DM.dataUF || [],
			PM = o.pageModel;
		if (PM.location == "remote") {
			return PM.totalRecords
		} else {
			return data.length + dataUF.length
		}
	};
	fn.refreshDataFromDataModel = function(obj) {
		obj = obj || {};
		var that = this,
			thisOptions = that.options,
			DM = thisOptions.dataModel,
			PM = thisOptions.pageModel,
			DMdata = DM.data,
			begIndx, endIndx, totalPages, totalRecords, paging = PM.type,
			rowIndxOffset, qTriggers = that._queueATriggers;
		for (var key in qTriggers) {
			var t = qTriggers[key];
			delete qTriggers[key];
			that._trigger(key, t.evt, t.ui)
		}
		that._trigger("beforeRefreshData", null, {});
		if (paging == "local") {
			totalRecords = PM.totalRecords = DMdata.length;
			PM.totalPages = totalPages = Math.ceil(totalRecords / PM.rPP);
			if (PM.curPage > totalPages) {
				PM.curPage = totalPages
			}
			if (totalPages && !PM.curPage) {
				PM.curPage = 1
			}
			begIndx = (PM.curPage - 1) * PM.rPP;
			begIndx = begIndx >= 0 ? begIndx : 0;
			endIndx = PM.curPage * PM.rPP;
			if (endIndx > DMdata.length) {
				endIndx = DMdata.length
			}
			that.pdata = DMdata.slice(begIndx, endIndx);
			rowIndxOffset = begIndx
		} else if (paging == "remote") {
			PM.totalPages = totalPages = Math.ceil(PM.totalRecords / PM.rPP);
			if (PM.curPage > totalPages) {
				PM.curPage = totalPages
			}
			if (totalPages && !PM.curPage) {
				PM.curPage = 1
			}
			endIndx = PM.rPP;
			if (endIndx > DMdata.length) {
				endIndx = DMdata.length
			}
			that.pdata = DMdata.slice(0, endIndx);
			rowIndxOffset = PM.rPP * (PM.curPage - 1)
		} else {
			if (thisOptions.backwardCompat) {
				that.pdata = DMdata.slice(0)
			} else {
				that.pdata = DMdata
			}
		}
		that.riOffset = rowIndxOffset >= 0 ? rowIndxOffset : 0;
		that._trigger("dataReady", null, {
			source: obj.source
		});
		that._trigger("dataReadyAfter", null, {
			source: obj.source
		})
	};
	fn.getQueryStringCRUD = function() {
		return ""
	};
	fn.remoteRequest = function(objP) {
		if (this.loading) {
			this.xhr.abort()
		}
		objP = objP || {};
		var that = this,
			url = "",
			dataURL = "",
			o = this.options,
			raiseFilterEvent = false,
			thisColModel = this.colModel,
			DM = o.dataModel,
			SM = o.sortModel,
			FM = o.filterModel,
			PM = o.pageModel;
		if (typeof DM.getUrl == "function") {
			var objk = {
				colModel: thisColModel,
				dataModel: DM,
				sortModel: SM,
				groupModel: o.groupModel,
				pageModel: PM,
				filterModel: FM
			};
			var objURL = DM.getUrl.call(this, objk);
			if (objURL && objURL.url) {
				url = objURL.url
			}
			if (objURL && objURL.data) {
				dataURL = objURL.data
			}
		} else if (typeof DM.url == "string") {
			url = DM.url;
			var sortQueryString = {},
				filterQueryString = {},
				pageQueryString = {};
			if (SM.type == "remote") {
				if (!objP.initBySort) {
					this.sort({
						initByRemote: true
					})
				}
				var sortingQS = this.iSort.getQueryStringSort();
				if (sortingQS) {
					sortQueryString = {
						pq_sort: sortingQS
					}
				}
			}
			if (PM.type == "remote") {
				pageQueryString = {
					pq_curpage: PM.curPage,
					pq_rpp: PM.rPP
				}
			}
			var filterQS;
			if (FM.type != "local") {
				filterQS = this.iFilterData.getQueryStringFilter();
				if (filterQS) {
					raiseFilterEvent = true;
					filterQueryString = {
						pq_filter: filterQS
					}
				}
			}
			var postData = DM.postData,
				postDataOnce = DM.postDataOnce;
			if (postData && typeof postData == "function") {
				postData = postData.call(this, {
					colModel: thisColModel,
					dataModel: DM
				})
			}
			dataURL = $.extend({
				pq_datatype: DM.dataType
			}, filterQueryString, pageQueryString, sortQueryString, postData, postDataOnce)
		}
		if (!url) {
			return
		}
		this.loading = true;
		this.showLoading();
		this.xhr = $.ajax({
			url: url,
			dataType: DM.dataType,
			async: DM.async == null ? true : DM.async,
			cache: DM.cache,
			contentType: DM.contentType,
			type: DM.method,
			data: dataURL,
			beforeSend: function(jqXHR, settings) {
				if (typeof DM.beforeSend == "function") {
					return DM.beforeSend.call(that, jqXHR, settings)
				}
			},
			success: function(responseObj, textStatus, jqXHR) {
				that.onRemoteSuccess(responseObj, textStatus, jqXHR, raiseFilterEvent, objP)
			},
			error: function(jqXHR, textStatus, errorThrown) {
				that.hideLoading();
				that.loading = false;
				if (typeof DM.error == "function") {
					DM.error.call(that, jqXHR, textStatus, errorThrown)
				} else if (errorThrown != "abort") {
					throw "Error : " + errorThrown
				}
			}
		})
	};
	fn.onRemoteSuccess = function(response, textStatus, jqXHR, raiseFilterEvent, objP) {
		var that = this,
			o = that.options,
			retObj, CM = that.colModel,
			PM = o.pageModel,
			DM = o.dataModel;
		if (typeof DM.getData == "function") {
			retObj = DM.getData.call(that, response, textStatus, jqXHR)
		} else {
			retObj = response
		}
		DM.data = retObj.data;
		if (PM.type == "remote") {
			if (retObj.curPage != null) PM.curPage = retObj.curPage;
			if (retObj.totalRecords != null) {
				PM.totalRecords = retObj.totalRecords
			}
		}
		that.hideLoading();
		that.loading = false;
		that._trigger("load", null, {
			dataModel: DM,
			colModel: CM
		});
		if (raiseFilterEvent) {
			that._queueATriggers["filter"] = {
				ui: {}
			}
		}
		if (objP.callback) {
			objP.callback()
		}
	};
	fn._refreshTitle = function() {
		this.$title.html(this.options.title)
	};
	fn._destroyDraggable = function() {
		var ele = this.element;
		var $parent = ele.parent(".pq-wrapper");
		if ($parent.length && $parent.data("draggable")) {
			$parent.draggable("destroy");
			this.$title.removeClass("pq-draggable pq-no-capture");
			ele.unwrap(".pq-wrapper")
		}
	};
	fn._refreshDraggable = function() {
		var o = this.options,
			ele = this.element,
			$title = this.$title;
		if (o.draggable) {
			$title.addClass("pq-draggable pq-no-capture");
			var $wrap = ele.parent(".pq-wrapper");
			if (!$wrap.length) {
				ele.wrap("<div class='pq-wrapper' />")
			}
			ele.parent(".pq-wrapper").draggable({
				handle: $title
			})
		} else {
			this._destroyDraggable()
		}
	};
	fn._refreshResizable = function() {
		var that = this,
			$ele = this.element,
			o = this.options,
			widthPercent = (o.width + "").indexOf("%") > -1,
			heightPercent = (o.height + "").indexOf("%") > -1,
			autoWidth = o.width == "auto",
			flexWidth = o.width == "flex",
			flexHeight = o.height == "flex";
		if (o.resizable && (!(flexHeight || heightPercent) || !(flexWidth || widthPercent || autoWidth))) {
			var handles = "e,s,se";
			if (flexHeight || heightPercent) {
				handles = "e"
			} else if (flexWidth || widthPercent || autoWidth) {
				handles = "s"
			}
			var initReq = true;
			if ($ele.hasClass("ui-resizable")) {
				var handles2 = $ele.resizable("option", "handles");
				if (handles == handles2) {
					initReq = false
				} else {
					this._destroyResizable()
				}
			}
			if (initReq) {
				$ele.resizable({
					helper: "ui-state-default",
					handles: handles,
					minWidth: o.minWidth,
					minHeight: o.minHeight ? o.minHeight : 100,
					delay: 0,
					start: function(evt, ui) {
						$(ui.helper).css({
							opacity: .5,
							background: "#ccc",
							border: "1px solid steelblue"
						})
					},
					stop: function() {
						var $ele = that.element,
							ele = $ele[0],
							width = o.width,
							height = o.height,
							widthPercent = (width + "").indexOf("%") > -1,
							heightPercent = (height + "").indexOf("%") > -1,
							autoWidth = width == "auto",
							flexWidth = width == "flex",
							flexHeight = height == "flex",
							refreshRQ = false;
						ele.style.width = ele.offsetWidth + 3 + "px";
						ele.style.height = ele.offsetHeight + 3 + "px";
						if (!heightPercent && !flexHeight) {
							refreshRQ = true;
							o.height = ele.offsetHeight
						}
						if (!widthPercent && !autoWidth && !flexWidth) {
							refreshRQ = true;
							o.width = ele.offsetWidth
						}
						that.refresh({
							soft: true
						});
						$ele.css("position", "relative");
						if (refreshRQ) {
							$(window).trigger("resize")
						}
					}
				})
			}
		} else {
			this._destroyResizable()
		}
	};
	fn.refresh = function(objP) {
		this.iRefresh.refresh(objP)
	};
	fn.refreshView = function(obj) {
		if (this.options.editModel.indices != null) {
			this.blurEditor({
				force: true
			})
		}
		this.refreshDataFromDataModel(obj);
		this.refresh(obj)
	};
	fn._refreshPager = function() {
		var that = this,
			options = that.options,
			PM = options.pageModel,
			paging = !!PM.type,
			rPP = PM.rPP,
			totalRecords = PM.totalRecords;
		if (paging) {
			if (!that.pageI) {
				that._initPager()
			}
			that.pageI.option(PM);
			if (totalRecords > rPP) {
				that.$bottom.css("display", "")
			} else if (!options.showBottom) {
				that.$bottom.css("display", "none")
			}
		} else {
			if (that.pageI) {
				that.pageI.destroy()
			}
			if (options.showBottom) {
				that.$bottom.css("display", "")
			} else {
				that.$bottom.css("display", "none")
			}
		}
	};
	fn.getInstance = function() {
		return {
			grid: this
		}
	};
	fn.refreshDataAndView = function(objP) {
		var DM = this.options.dataModel;
		this.pdata = [];
		if (DM.location == "remote") {
			var self = this;
			this.remoteRequest({
				callback: function() {
					self._onDataAvailable(objP)
				}
			})
		} else {
			this._onDataAvailable(objP)
		}
	};
	fn.getColIndx = function(ui) {
		var dataIndx = ui.dataIndx,
			column = ui.column,
			colIndx, CM = this.colModel,
			len = CM.length,
			i = 0;
		if (column) {
			for (; i < len; i++) {
				if (CM[i] == column) return i
			}
		} else if (dataIndx != null) {
			colIndx = this.colIndxs[dataIndx];
			if (colIndx != null) return colIndx
		} else {
			throw "dataIndx / column NA"
		}
		return -1
	};
	fn.getColumn = function(obj) {
		var di = obj.dataIndx;
		if (di == null) {
			throw "dataIndx N/A"
		}
		return this.columns[di] || this.iGroup.getColsPrimary()[di]
	};
	fn._generateCellRowOutline = function() {
		var o = this.options,
			$parent, EM = o.editModel;
		if (this.$div_focus) {
			return
		} else {
			if (EM.inline) {
				$parent = this.getCell(EM.indices);
				$parent.css("padding", 0).empty()
			} else {
				$parent = this.element
			}
			this.$div_focus = $(["<div class='pq-editor-outer'>", "<div class='pq-editor-inner'>", "</div>", "</div>"].join("")).appendTo($parent)
		}
	};
	fn._removeEditOutline = function() {
		function destroyDatePicker($editor) {
			if ($editor.hasClass("hasDatepicker")) {
				$editor.datepicker("hide").datepicker("destroy")
			}
		}
		if (this.$div_focus) {
			var $editor = this.$div_focus.find(".pq-editor-focus");
			destroyDatePicker($editor);
			if ($editor[0] == document.activeElement) {
				var prevBlurEditMode = this._blurEditMode;
				this._blurEditMode = true;
				$editor.blur();
				this._blurEditMode = prevBlurEditMode
			}
			this.$div_focus.remove();
			delete this.$div_focus;
			var EM = this.options.editModel,
				obj = $.extend({}, EM.indices);
			EM.indices = null;
			obj.rowData = undefined;
			this.refreshCell(obj)
		}
	};
	fn.scrollX = function(x, fn) {
		var self = this;
		return self.iRenderB.scrollX(x, function() {
			fn && fn.call(self)
		})
	};
	fn.scrollY = function(y, fn) {
		var self = this;
		return self.iRenderB.scrollY(y, function() {
			fn && fn.call(self)
		})
	};
	fn.scrollXY = function(x, y, fn) {
		var self = this;
		return self.iRenderB.scrollXY(x, y, function() {
			fn && fn.call(self)
		})
	};
	fn.scrollRow = function(obj, fn) {
		var self = this;
		self.iRenderB.scrollRow(self.normalize(obj).rowIndxPage, function() {
			fn && fn.call(self)
		})
	};
	fn.scrollColumn = function(obj, fn) {
		var self = this;
		self.iRenderB.scrollColumn(self.normalize(obj).colIndx, function() {
			fn && fn.call(self)
		})
	};
	fn.scrollCell = function(obj, fn) {
		var self = this,
			ui = self.normalize(obj);
		self.iRenderB.scrollCell(ui.rowIndxPage, ui.colIndx, function() {
			fn && fn.call(self);
			self._trigger("scrollCell")
		})
	};
	fn.blurEditor = function(objP) {
		if (this.$div_focus) {
			var $editor = this.$div_focus.find(".pq-editor-focus");
			if (objP && objP.blurIfFocus) {
				if (document.activeElement == $editor[0]) {
					$editor.blur()
				}
			} else {
				return $editor.triggerHandler("blur", objP)
			}
		}
	};
	fn.Selection = function() {
		return this.iSelection
	};
	fn.goToPage = function(obj) {
		var DM = this.options.pageModel;
		if (DM.type == "local" || DM.type == "remote") {
			var rowIndx = obj.rowIndx,
				rPP = DM.rPP,
				page = obj.page == null ? Math.ceil((rowIndx + 1) / rPP) : obj.page,
				curPage = DM.curPage;
			if (page != curPage) {
				DM.curPage = page;
				if (DM.type == "local") {
					this.refreshView()
				} else {
					this.refreshDataAndView()
				}
			}
		}
	};
	fn.setSelection = function(obj, fn) {
		if (obj == null) {
			this.iSelection.removeAll();
			this.iRows.removeAll({
				all: true
			});
			return true
		}
		var self = this,
			data = self.pdata,
			cb = function() {
				if (rowIndxPage != null && obj.focus !== false) {
					self.focus({
						rowIndxPage: rowIndxPage,
						colIndx: colIndx == null ? self.getFirstVisibleCI() : colIndx
					})
				}
				fn && fn.call(self)
			};
		if (!data || !data.length) {
			cb()
		}
		obj = this.normalize(obj);
		var rowIndx = obj.rowIndx,
			rowIndxPage = obj.rowIndxPage,
			colIndx = obj.colIndx;
		if (rowIndx == null || rowIndx < 0 || colIndx < 0 || colIndx >= this.colModel.length) {
			cb()
		}
		this.goToPage(obj);
		rowIndxPage = rowIndx - this.riOffset;
		self.scrollRow({
			rowIndxPage: rowIndxPage
		}, function() {
			if (colIndx == null) {
				self.iRows.add({
					rowIndx: rowIndx
				});
				cb()
			} else {
				self.scrollColumn({
					colIndx: colIndx
				}, function() {
					self.Range({
						r1: rowIndx,
						c1: colIndx
					}).select();
					cb()
				})
			}
		})
	};
	fn.getColModel = function() {
		return this.colModel
	};
	fn.getCMPrimary = function() {
		return this.iGroup.getCMPrimary()
	};
	fn.getOCMPrimary = function() {
		return this.iGroup.getOCMPrimary()
	};
	fn.saveEditCell = function(objP) {
		var o = this.options;
		var EM = o.editModel;
		if (!EM.indices) {
			return null
		}
		var obj = $.extend({}, EM.indices),
			evt = objP ? objP.evt : null,
			offset = this.riOffset,
			colIndx = obj.colIndx,
			rowIndxPage = obj.rowIndxPage,
			rowIndx = rowIndxPage + offset,
			thisColModel = this.colModel,
			column = thisColModel[colIndx],
			dataIndx = column.dataIndx,
			pdata = this.pdata,
			rowData = pdata[rowIndxPage],
			DM = o.dataModel,
			oldVal;
		if (rowData == null) {
			return null
		}
		if (rowIndxPage != null) {
			var newVal = this.getEditCellData();
			if ($.isPlainObject(newVal)) {
				oldVal = {};
				for (var key in newVal) {
					oldVal[key] = rowData[key]
				}
			} else {
				oldVal = this.readCell(rowData, column)
			}
			if (newVal == "<br>") {
				newVal = ""
			}
			if (oldVal == null && newVal === "") {
				newVal = null
			}
			var objCell = {
				rowIndx: rowIndx,
				rowIndxPage: rowIndxPage,
				dataIndx: dataIndx,
				column: column,
				newVal: newVal,
				value: newVal,
				oldVal: oldVal,
				rowData: rowData,
				dataModel: DM
			};
			if (this._trigger("cellBeforeSave", evt, objCell) === false) {
				return false
			}
			var newRow = {};
			if ($.isPlainObject(newVal)) {
				newRow = newVal
			} else {
				newRow[dataIndx] = newVal
			}
			var ret = this.updateRow({
				row: newRow,
				rowIndx: rowIndx,
				silent: true,
				source: "edit",
				checkEditable: false
			});
			if (ret === false) {
				return false
			}
			this._trigger("cellSave", evt, objCell);
			return true
		}
	};
	fn._digestNewRow = function(newRow, oldRow, rowIndx, rowData, type, rowCheckEditable, validate, allowInvalid, source) {
		var that = this,
			getValueFromDataType = that.getValueFromDataType,
			dataIndx, columns = that.columns,
			colIndxs = that.colIndxs,
			column, colIndx;
		for (dataIndx in newRow) {
			column = columns[dataIndx];
			colIndx = colIndxs[dataIndx];
			if (column) {
				if (rowCheckEditable && that.isEditable({
						rowIndx: rowIndx,
						rowData: rowData,
						colIndx: colIndx,
						column: column
					}) === false) {
					delete newRow[dataIndx];
					oldRow && delete oldRow[dataIndx];
					continue
				}
				var dataType = column.dataType,
					newVal = getValueFromDataType(newRow[dataIndx], dataType),
					oldVal = oldRow ? oldRow[dataIndx] : undefined;
				oldVal = oldVal !== undefined ? getValueFromDataType(oldVal, dataType) : undefined;
				newRow[dataIndx] = newVal;
				if (validate && column.validations) {
					if (source == "edit" && allowInvalid === false) {
						var objRet = this.isValid({
							focusInvalid: true,
							dataIndx: dataIndx,
							rowIndx: rowIndx,
							value: newVal
						});
						if (objRet.valid == false && !objRet.warn) {
							return false
						}
					} else {
						var wRow = type == "add" ? newRow : rowData;
						objRet = this.iValid.isValidCell({
							column: column,
							rowData: wRow,
							allowInvalid: allowInvalid,
							value: newVal
						});
						if (objRet.valid === false) {
							if (allowInvalid === false && !objRet.warn) {
								delete newRow[dataIndx]
							}
						}
					}
				}
				if (type == "update" && newVal === oldVal) {
					delete newRow[dataIndx];
					delete oldRow[dataIndx];
					continue
				}
			}
		}
		if (type == "update") {
			if (!pq.isEmpty(newRow)) {
				return true
			}
		} else {
			return true
		}
	};
	fn._digestData = function(ui) {
		if (ui.rowList) {
			throw "not supported"
		} else {
			addList = ui.addList = ui.addList || [], ui.updateList = ui.updateList || [], ui.deleteList = ui.deleteList || [];
			if (addList.length && addList[0].rowData) {
				throw "rd in addList"
			}
		}
		if (this._trigger("beforeValidate", null, ui) === false) {
			return false
		}
		var that = this,
			options = that.options,
			EM = options.editModel,
			DM = options.dataModel,
			data = DM.data || [],
			dataUF = DM.dataUF || [],
			CM = options.colModel,
			PM = options.pageModel,
			HM = options.historyModel,
			dis = CM.map(function(col) {
				return col.dataIndx
			}),
			validate = ui.validate == null ? EM.validate : ui.validate,
			remotePaging = PM.type == "remote",
			allowInvalid = ui.allowInvalid == null ? EM.allowInvalid : ui.allowInvalid,
			TM = options.trackModel,
			track = ui.track,
			history = ui.history == null ? HM.on : ui.history,
			iHistory = this.iHistory,
			iUCData = this.iUCData,
			checkEditable = ui.checkEditable == null ? true : ui.checkEditable,
			checkEditableAdd = ui.checkEditableAdd == null ? checkEditable : ui.checkEditableAdd,
			source = ui.source,
			iRefresh = that.iRefresh,
			offset = this.riOffset,
			addList = ui.addList,
			updateList = ui.updateList,
			deleteList = ui.deleteList,
			addListLen, deleteListLen, i, len, addListNew = [],
			updateListNew = [];
		track = track == null ? options.track == null ? TM.on : options.track : track;
		for (i = 0, len = updateList.length; i < len; i++) {
			var rowListObj = updateList[i],
				newRow = rowListObj.newRow,
				rowData = rowListObj.rowData,
				rowCheckEditable = rowListObj.checkEditable,
				rowIndx = rowListObj.rowIndx,
				oldRow = rowListObj.oldRow,
				ret;
			rowCheckEditable == null && (rowCheckEditable = checkEditable);
			if (!oldRow) {
				throw "oldRow required while update"
			}
			ret = this._digestNewRow(newRow, oldRow, rowIndx, rowData, "update", rowCheckEditable, validate, allowInvalid, source);
			if (ret === false) {
				return false
			}
			ret && updateListNew.push(rowListObj)
		}
		for (i = 0, len = addList.length; i < len; i++) {
			rowListObj = addList[i];
			newRow = rowListObj.newRow;
			rowCheckEditable = rowListObj.checkEditable;
			rowIndx = rowListObj.rowIndx;
			rowCheckEditable == null && (rowCheckEditable = checkEditableAdd);
			dis.forEach(function(di) {
				newRow[di] = newRow[di]
			});
			ret = this._digestNewRow(newRow, oldRow, rowIndx, rowData, "add", rowCheckEditable, validate, allowInvalid, source);
			if (ret === false) {
				return false
			}
			ret && addListNew.push(rowListObj)
		}
		addList = ui.addList = addListNew;
		updateList = ui.updateList = updateListNew;
		addListLen = addList.length;
		deleteListLen = deleteList.length;
		if (!addListLen && !updateList.length && !deleteListLen) {
			if (source == "edit") {
				return null
			}
			return false
		}
		if (history) {
			iHistory.increment();
			iHistory.push(ui)
		}
		that._digestUpdate(updateList, iUCData, track);
		if (deleteListLen) {
			that._digestDelete(deleteList, iUCData, track, data, dataUF, PM, remotePaging, offset);
			iRefresh.addRowIndx()
		}
		if (addListLen) {
			that._digestAdd(addList, iUCData, track, data, PM, remotePaging, offset);
			iRefresh.addRowIndx()
		}
		that._trigger("change", null, ui);
		return true
	};
	fn._digestUpdate = function(rowList, iUCData, track) {
		var i = 0,
			len = rowList.length,
			column, newVal, dataIndx, columns = this.columns,
			saveCell = this.saveCell;
		for (; i < len; i++) {
			var rowListObj = rowList[i],
				newRow = rowListObj.newRow,
				rowData = rowListObj.rowData;
			if (track) {
				iUCData.update({
					rowData: rowData,
					row: newRow,
					refresh: false
				})
			}
			for (dataIndx in newRow) {
				column = columns[dataIndx];
				newVal = newRow[dataIndx];
				saveCell(rowData, column, newVal)
			}
		}
	};
	fn._digestAdd = function(rowList, iUCData, track, data, PM, remotePaging, offset) {
		var i = 0,
			len = rowList.length,
			indx, rowIndxPage;
		rowList.sort(function(a, b) {
			return a.rowIndx - b.rowIndx
		});
		for (; i < len; i++) {
			var rowListObj = rowList[i],
				newRow = rowListObj.newRow,
				rowIndx = rowListObj.rowIndx;
			if (track) {
				iUCData.add({
					rowData: newRow
				})
			}
			if (rowIndx == null) {
				data.push(newRow)
			} else {
				rowIndxPage = rowIndx - offset;
				indx = remotePaging ? rowIndxPage : rowIndx;
				data.splice(indx, 0, newRow)
			}
			rowListObj.rowData = newRow;
			if (remotePaging) {
				PM.totalRecords++
			}
		}
	};
	fn._digestDelete = function(rowList, iUCData, track, data, dataUF, PM, remotePaging, offset) {
		var i = 0,
			len = rowList.length,
			remArr, rowIndx;
		for (; i < len; i++) {
			var rowListObj = rowList[i],
				rowData = rowListObj.rowData,
				uf = false,
				indx = data.indexOf(rowData);
			if (indx == -1) {
				indx = dataUF.indexOf(rowData);
				if (indx >= 0) {
					uf = true
				}
			} else {
				rowListObj.rowIndx = remotePaging ? indx + offset : indx
			}
			rowListObj.uf = uf;
			rowListObj.indx = indx
		}
		rowList.sort(function(a, b) {
			return b.rowIndx - a.rowIndx
		});
		for (i = 0; i < len; i++) {
			rowListObj = rowList[i];
			rowData = rowListObj.rowData;
			uf = rowListObj.uf;
			rowIndx = rowListObj.rowIndx;
			indx = rowListObj.indx;
			if (track) {
				iUCData["delete"]({
					rowIndx: rowIndx,
					rowData: rowData
				})
			}
			if (uf) {
				dataUF.splice(indx, 1)
			} else {
				remArr = data.splice(indx, 1);
				if (remArr && remArr.length && remotePaging) {
					PM.totalRecords--
				}
			}
		}
	};
	fn.refreshColumn = function(ui) {
		var self = this,
			obj = self.normalize(ui),
			iR = self.iRenderB;
		obj.skip = true;
		iR.eachV(function(rd, rip) {
			obj.rowIndxPage = rip;
			self.refreshCell(obj)
		});
		self._trigger("refreshColumn", null, obj)
	};
	fn.refreshCell = function(ui) {
		var that = this,
			obj = that.normalize(ui),
			_fe = that._focusEle,
			rip = obj.rowIndxPage,
			ci = obj.colIndx;
		if (that.iRenderB.refreshCell(rip, ci, obj.rowData, obj.column)) {
			if (_fe && _fe.rowIndxPage == rip) {
				that.focus()
			}
			if (!obj.skip) {
				that.refresh({
					soft: true
				});
				that._trigger("refreshCell", null, obj)
			}
		}
	};
	fn.refreshHeaderCell = function(ui) {
		var obj = this.normalize(ui),
			hc = this.headerCells,
			rip = hc.length - 1,
			rd = hc[rip];
		this.iRenderHead.refreshCell(rip, obj.colIndx, rd, obj.column)
	};
	fn.refreshRow = function(_obj) {
		if (this.pdata) {
			var that = this,
				obj = that.normalize(_obj),
				ri = obj.rowIndx,
				rip = obj.rowIndxPage,
				_fe, rowData = obj.rowData;
			if (!rowData) {
				return null
			}
			that.iRenderB.refreshRow(rip);
			that.refresh({
				soft: true
			});
			if ((_fe = that._focusEle) && _fe.rowIndxPage == rip) {
				that.focus()
			}
			that._trigger("refreshRow", null, {
				rowData: rowData,
				rowIndx: ri,
				rowIndxPage: rip
			});
			return true
		}
	};
	fn.quitEditMode = function(objP) {
		if (this._quitEditMode) {
			return
		}
		var that = this,
			old = false,
			silent = false,
			fireOnly = false,
			o = this.options,
			EM = o.editModel,
			EMIndices = EM.indices,
			evt = undefined;
		that._quitEditMode = true;
		if (objP) {
			old = objP.old;
			silent = objP.silent;
			fireOnly = objP.fireOnly;
			evt = objP.evt
		}
		if (EMIndices) {
			if (!silent && !old) {
				this._trigger("editorEnd", evt, EMIndices)
			}
			if (!fireOnly) {
				this._removeEditOutline(objP);
				EM.indices = null
			}
		}
		that._quitEditMode = null
	};
	fn.getViewPortRowsIndx = function() {
		return {
			beginIndx: this.initV,
			endIndx: this.finalV
		}
	};
	fn.getViewPortIndx = function() {
		var iR = this.iRenderB;
		return {
			initV: iR.initV,
			finalV: iR.finalV,
			initH: iR.initH,
			finalH: iR.finalH
		}
	};
	fn.getRIOffset = function() {
		return this.riOffset
	};
	fn.getEditCell = function() {
		var EM = this.options.editModel;
		if (EM.indices) {
			var $td = this.getCell(EM.indices),
				$cell = this.$div_focus.children(".pq-editor-inner"),
				$editor = $cell.find(".pq-editor-focus");
			return {
				$td: $td,
				$cell: $cell,
				$editor: $editor
			}
		} else {
			return {}
		}
	};
	fn.editCell = function(ui) {
		var self = this,
			obj = self.normalize(ui),
			iM = self.iMerge,
			m, $td, ri = obj.rowIndx,
			ci = obj.colIndx;
		if (iM.ismergedCell(ri, ci)) {
			m = iM.getRootCellO(ri, ci);
			if (m.rowIndx != obj.rowIndx || m.colIndx != obj.colIndx) {
				return false
			}
		}
		self.scrollCell(obj, function() {
			$td = self.getCell(obj);
			if ($td && $td.length) {
				return self._editCell(obj)
			}
		})
	};
	fn.getFirstEditableColIndx = function(objP) {
		if (objP.rowIndx == null) {
			throw "rowIndx NA"
		}
		var CM = this.colModel,
			i = 0;
		for (; i < CM.length; i++) {
			if (CM[i].hidden) {
				continue
			}
			objP.colIndx = i;
			if (!this.isEditable(objP)) {
				continue
			}
			return i
		}
		return -1
	};
	fn.editFirstCellInRow = function(objP) {
		var obj = this.normalize(objP),
			ri = obj.rowIndx,
			colIndx = this.getFirstEditableColIndx({
				rowIndx: ri
			});
		if (colIndx != -1) {
			this.editCell({
				rowIndx: ri,
				colIndx: colIndx
			})
		}
	};
	fn._editCell = function(_objP) {
		var that = this,
			objP = that.normalize(_objP),
			evt = objP.evt,
			rip = objP.rowIndxPage,
			ci = objP.colIndx,
			pdata = that.pdata;
		if (!pdata || rip >= pdata.length) {
			return false
		}
		var o = that.options,
			EM = o.editModel,
			rowData = pdata[rip],
			rowIndx = objP.rowIndx,
			CM = that.colModel,
			column = CM[ci],
			dataIndx = column.dataIndx,
			cellData = that.readCell(rowData, column),
			objCall = {
				rowIndx: rowIndx,
				rowIndxPage: rip,
				cellData: cellData,
				rowData: rowData,
				dataIndx: dataIndx,
				colIndx: ci,
				column: column
			},
			ceditor = column.editor,
			grid = that,
			type_editor = typeof ceditor;
		ceditor = type_editor == "function" || type_editor == "string" ? grid.callFn(ceditor, objCall) : ceditor;
		if (ceditor === undefined && typeof o.geditor == "function") {
			ceditor = o.geditor.call(grid, objCall)
		}
		if (ceditor === false) {
			return
		}
		if (ceditor && ceditor.getData) {
			EM._getData = ceditor.getData
		}
		var geditor = o.editor,
			editor = ceditor ? $.extend({}, geditor, ceditor) : geditor,
			contentEditable = false;
		if (EM.indices) {
			var indxOld = EM.indices;
			if (indxOld.rowIndxPage == rip && indxOld.colIndx == ci) {
				var $focus = that.$div_focus.find(".pq-editor-focus");
				$focus[0].focus();
				if (document.activeElement != $focus[0]) {
					window.setTimeout(function() {
						$focus.focus()
					}, 0)
				}
				return false
			} else {
				if (that.blurEditor({
						evt: evt
					}) === false) {
					return false
				}
				that.quitEditMode({
					evt: evt
				})
			}
		}
		EM.indices = {
			rowIndxPage: rip,
			rowIndx: rowIndx,
			colIndx: ci,
			column: column,
			dataIndx: dataIndx
		};
		that._generateCellRowOutline();
		var $div_focus = that.$div_focus,
			$cell = $div_focus.children(".pq-editor-inner");
		$cell.addClass("pq-align-" + (column.align || "left"));
		objCall.$cell = $cell;
		var inp, edtype = editor.type,
			edSelect = objP.select == null ? editor.select : objP.select,
			edInit = editor.init,
			ed_valueIndx = editor.valueIndx,
			ed_dataMap = editor.dataMap,
			ed_mapIndices = editor.mapIndices || {},
			edcls = editor.cls || "",
			edcls = typeof edcls === "function" ? edcls.call(grid, objCall) : edcls,
			cls = "pq-editor-focus " + edcls,
			cls2 = cls + " pq-cell-editor ",
			attr = editor.attr || "",
			attr = typeof attr === "function" ? attr.call(grid, objCall) : attr,
			edstyle = editor.style || "",
			edstyle = typeof edstyle === "function" ? edstyle.call(grid, objCall) : edstyle,
			styleCE = edstyle ? "style='" + edstyle + "'" : "",
			style = styleCE,
			styleChk = styleCE;
		objCall.cls = cls;
		objCall.attr = attr;
		if (typeof edtype == "function") {
			inp = edtype.call(grid, objCall);
			if (inp) {
				edtype = inp
			}
		}
		geditor._type = edtype;
		if (edtype == "checkbox") {
			var subtype = editor.subtype,
				checked = cellData ? "checked='checked'" : "";
			inp = "<input " + checked + " class='" + cls2 + "' " + attr + " " + styleChk + " type=checkbox name='" + dataIndx + "' />";
			$cell.html(inp);
			var $ele = $cell.children("input");
			if (subtype == "triple") {
				$ele.pqval({
					val: cellData
				});
				$cell.click(function() {
					$(this).children("input").pqval({
						incr: true
					})
				})
			}
		} else if (edtype == "textarea" || edtype == "select" || edtype == "textbox") {
			if (edtype == "textarea") {
				inp = "<textarea class='" + cls2 + "' " + attr + " " + style + " name='" + dataIndx + "' ></textarea>";
			} else if (edtype == "select") {
				var options = editor.options || [];
				if (options.constructor !== Array) {
					options = that.callFn(options, objCall)
				}
				var attrSelect = [attr, " class='", cls2, "' ", style, " name='", dataIndx, "'"].join("");
				inp = _pq.select({
					options: options,
					attr: attrSelect,
					prepend: editor.prepend,
					labelIndx: editor.labelIndx,
					valueIndx: ed_valueIndx,
					groupIndx: editor.groupIndx,
					dataMap: ed_dataMap
				})
			} else {
				inp = "<input class='" + cls2 + "' " + attr + " " + style + " type=text name='" + dataIndx + "' />"
			}
			$(inp).appendTo($cell).val(edtype == "select" && ed_valueIndx != null && (ed_mapIndices[ed_valueIndx] || this.columns[ed_valueIndx]) ? ed_mapIndices[ed_valueIndx] ? rowData[ed_mapIndices[ed_valueIndx]] : rowData[ed_valueIndx] : cellData)
		} else if (!edtype || edtype == "contenteditable") {
			inp = "<div contenteditable='true' tabindx='0' " + styleCE + " " + attr + " class='" + cls2 + "'></div>";
			$cell.html(inp);
			$cell.children().html(cellData);
			contentEditable = true
		}
		objCall.$editor = $cell.children(".pq-editor-focus");
		$focus = $cell.children(".pq-editor-focus");
		var FK = EM.filterKeys,
			$td = that.getCell(EM.indices),
			cEM = column.editModel;
		if (cEM && cEM.filterKeys !== undefined) {
			FK = cEM.filterKeys
		}
		if (edtype != "textarea") $td.empty();
		var objTrigger = {
			$cell: $cell,
			$editor: $focus,
			$td: $td,
			dataIndx: dataIndx,
			column: column,
			colIndx: ci,
			rowIndx: rowIndx,
			rowIndxPage: rip,
			rowData: rowData
		};
		that._trigger("editorBegin", evt, objTrigger);
		EM.indices = objTrigger;
		$focus = $cell.children(".pq-editor-focus");
		$focus.data({
			FK: FK
		}).on("click", function() {
			$(this).focus();
			that._trigger("editorClick", null, objTrigger)
		}).on("keydown", function(evt) {
			that.iKeyNav.keyDownInEdit(evt)
		}).on("keypress", function(evt) {
			return that.iKeyNav.keyPressInEdit(evt, {
				FK: FK
			})
		}).on("keyup", function(evt) {
			return that.iKeyNav.keyUpInEdit(evt, {
				FK: FK
			})
		}).on("blur", fn._onBlur = function(evt, objP) {
			var EM = o.editModel,
				onBlur = EM.onBlur,
				saveOnBlur = onBlur == "save",
				ae = document.activeElement,
				$this = $(evt.target),
				validateOnBlur = onBlur == "validate",
				cancelBlurCls = EM.cancelBlurCls,
				force = objP ? objP.force : false;
			if (that._quitEditMode || that._blurEditMode) {
				return
			}
			if (!EM.indices) {
				return
			}
			if (!force) {
				if (that._trigger("editorBlur", evt, objTrigger) === false) {
					return
				}
				if (!onBlur) {
					return
				}
				if ($this[0] == ae) {
					return
				}
				if (cancelBlurCls && $this.hasClass(cancelBlurCls)) {
					return
				}
				if ($this.hasClass("pq-autocomplete-text")) {
					if ($("." + $this.data("id")).is(":visible")) return
				} else if ($this.hasClass("hasDatepicker")) {
					if ($this.datepicker("widget").is(":visible")) {
						return false
					}
				} else if ($this.hasClass("ui-autocomplete-input")) {
					if ($this.autocomplete("widget").is(":visible")) return
				} else if ($this.hasClass("ui-multiselect")) {
					if ($(".ui-multiselect-menu").is(":visible") || $(ae).closest(".ui-multiselect-menu").length) {
						return
					}
				} else if ($this.hasClass("pq-select-button")) {
					if ($(".pq-select-menu").is(":visible") || $(ae).closest(".pq-select-menu").length) {
						return
					}
				}
			}
			that._blurEditMode = true;
			var silent = force || saveOnBlur || !validateOnBlur;
			if (!that.saveEditCell({
					evt: evt,
					silent: silent
				})) {
				if (!force && validateOnBlur) {
					that._deleteBlurEditMode();
					return false
				}
			}
			that.quitEditMode({
				evt: evt
			});
			that._deleteBlurEditMode()
		}).on("focus", function(evt) {
			that._trigger("editorFocus", evt, objTrigger)
		});
		$focus.focus();
		window.setTimeout(function() {
			var $ae = $(document.activeElement);
			if ($ae.hasClass("pq-editor-focus") === false) {
				var $focus = that.element ? that.element.find(".pq-editor-focus") : $();
				$focus.focus()
			}
		});
		if (edSelect) {
			if (contentEditable) {
				try {
					var el = $focus[0];
					var range = document.createRange();
					range.selectNodeContents(el);
					var sel = window.getSelection();
					sel.removeAllRanges();
					sel.addRange(range)
				} catch (ex) {}
			} else {
				$focus.select()
			}
		}
	};
	fn._deleteBlurEditMode = function(objP) {
		var that = this;
		objP = objP || {};
		if (that._blurEditMode) {
			if (objP.timer) {
				window.setTimeout(function() {
					delete that._blurEditMode
				}, 0)
			} else {
				delete that._blurEditMode
			}
		}
	};
	fn.getRow = function(_obj) {
		var obj = this.normalize(_obj),
			rip = obj.rowIndxPage;
		return this.iRenderB.get$Row(rip)
	};
	fn.getCell = function(ui) {
		if (ui.vci >= 0) ui.colIndx = this.iCols.getci(ui.vci);
		var obj = this.normalize(ui),
			rip = obj.rowIndxPage,
			ci = obj.colIndx,
			td = this.iRenderB.getCell(rip, ci);
		return $(td)
	};
	fn.getCellHeader = function(ui) {
		if (ui.vci >= 0) ui.colIndx = this.iCols.getci(ui.vci);
		var obj = this.normalize(ui),
			ci = obj.colIndx,
			rowIndx = obj.ri,
			ri = rowIndx >= 0 ? rowIndx : this.headerCells.length - 1,
			th = this.iRenderHead.getCell(ri, ci);
		return $(th)
	};
	fn.getCellFilter = function(ui) {
		ui.ri = this.headerCells.length;
		return this.getCellHeader(ui)
	};
	fn.getEditorIndices = function() {
		var obj = this.options.editModel.indices;
		if (!obj) {
			return null
		} else {
			return $.extend({}, obj)
		}
	};
	fn.getEditCellData = function() {
		var o = this.options,
			EM = o.editModel,
			obj = EM.indices;
		if (!obj) {
			return null
		}
		var colIndx = obj.colIndx,
			rowIndxPage = obj.rowIndxPage,
			rowIndx = obj.rowIndx,
			column = this.colModel[colIndx],
			ceditor = column.editor,
			geditor = o.editor,
			editor = ceditor ? $.extend({}, geditor, ceditor) : geditor,
			ed_valueIndx = editor.valueIndx,
			ed_labelIndx = editor.labelIndx,
			ed_mapIndices = editor.mapIndices || {},
			dataIndx = column.dataIndx,
			$div_focus = this.$div_focus,
			$cell = $div_focus.children(".pq-editor-inner"),
			dataCell;
		var getData = EM._getData || editor.getData;
		EM._getData = undefined;
		if (getData) {
			dataCell = this.callFn(getData, EM.indices)
		} else {
			var edtype = geditor._type;
			if (edtype == "checkbox") {
				var $ele = $cell.children();
				if (editor.subtype == "triple") {
					dataCell = $ele.pqval()
				} else {
					dataCell = $ele.is(":checked") ? true : false
				}
			} else if (edtype == "contenteditable") {
				dataCell = $cell.children().html()
			} else {
				var $ed = $cell.find('*[name="' + dataIndx + '"]');
				if ($ed && $ed.length) {
					if (edtype == "select" && ed_valueIndx != null) {
						if (!ed_mapIndices[ed_valueIndx] && !this.columns[ed_valueIndx]) {
							dataCell = $ed.val()
						} else {
							dataCell = {};
							dataCell[ed_mapIndices[ed_valueIndx] ? ed_mapIndices[ed_valueIndx] : ed_valueIndx] = $ed.val();
							dataCell[ed_mapIndices[ed_labelIndx] ? ed_mapIndices[ed_labelIndx] : ed_labelIndx] = $ed.find("option:selected").text();
							var dataMap = editor.dataMap;
							if (dataMap) {
								var jsonMap = $ed.find("option:selected").data("map");
								if (jsonMap) {
									for (var k = 0; k < dataMap.length; k++) {
										var key = dataMap[k];
										dataCell[ed_mapIndices[key] ? ed_mapIndices[key] : key] = jsonMap[key]
									}
								}
							}
						}
					} else {
						dataCell = $ed.val()
					}
				} else {
					var $ed = $cell.find(".pq-editor-focus");
					if ($ed && $ed.length) {
						dataCell = $ed.val()
					}
				}
			}
		}
		return dataCell
	};
	fn.getCellIndices = function(objP) {
		var $td = objP.$td,
			arr, obj = {},
			ri;
		if ($td && $td.length && $td.closest(".pq-body-outer")[0] == this.$cont[0]) {
			arr = this.iRenderB.getCellIndx($td[0]);
			if (arr) {
				ri = arr[0] + this.riOffset;
				obj = this.iMerge.getRootCellO(ri, arr[1], true)
			}
		}
		return obj
	};
	fn.getRowsByClass = function(obj) {
		var options = this.options,
			DM = options.dataModel,
			PM = options.pageModel,
			remotePaging = PM.type == "remote",
			offset = this.riOffset,
			data = DM.data,
			rows = [];
		if (data == null) {
			return rows
		}
		for (var i = 0, len = data.length; i < len; i++) {
			var rd = data[i];
			if (rd.pq_rowcls) {
				obj.rowData = rd;
				if (this.hasClass(obj)) {
					var row = {
							rowData: rd
						},
						ri = remotePaging ? i + offset : i,
						rip = ri - offset;
					row.rowIndx = ri;
					row.rowIndxPage = rip;
					rows.push(row)
				}
			}
		}
		return rows
	};
	fn.getCellsByClass = function(obj) {
		var that = this,
			options = this.options,
			DM = options.dataModel,
			PM = options.pageModel,
			remotePaging = PM.type == "remote",
			offset = this.riOffset,
			data = DM.data,
			cells = [];
		if (data == null) {
			return cells
		}
		for (var i = 0, len = data.length; i < len; i++) {
			var rd = data[i],
				ri = remotePaging ? i + offset : i,
				cellcls = rd.pq_cellcls;
			if (cellcls) {
				for (var di in cellcls) {
					var ui = {
						rowData: rd,
						rowIndx: ri,
						dataIndx: di,
						cls: obj.cls
					};
					if (that.hasClass(ui)) {
						var cell = that.normalize(ui);
						cells.push(cell)
					}
				}
			}
		}
		return cells
	};
	fn.data = function(objP) {
		var colIndx = objP.colIndx,
			dataIndx = colIndx != null ? this.colModel[colIndx].dataIndx : objP.dataIndx,
			data = objP.data,
			readOnly = data == null || typeof data == "string" ? true : false,
			rowData = objP.rowData || this.getRowData(objP);
		if (!rowData) {
			return {
				data: null
			}
		}
		if (dataIndx == null) {
			var rowdata = rowData.pq_rowdata;
			if (readOnly) {
				var ret;
				if (rowdata != null) {
					if (data == null) {
						ret = rowdata
					} else {
						ret = rowdata[data]
					}
				}
				return {
					data: ret
				}
			}
			var finalData = $.extend(true, rowData.pq_rowdata, data);
			rowData.pq_rowdata = finalData
		} else {
			var celldata = rowData.pq_celldata;
			if (readOnly) {
				if (celldata != null) {
					var a = celldata[dataIndx];
					if (data == null || a == null) {
						ret = a
					} else {
						ret = a[data]
					}
				}
				return {
					data: ret
				}
			}
			if (!celldata) {
				rowData.pq_celldata = {}
			}
			finalData = $.extend(true, rowData.pq_celldata[dataIndx], data);
			rowData.pq_celldata[dataIndx] = finalData
		}
	};
	fn.attr = function(objP) {
		var rowIndx = objP.rowIndx,
			colIndx = objP.colIndx,
			dataIndx = colIndx != null ? this.colModel[colIndx].dataIndx : objP.dataIndx,
			attr = objP.attr,
			readOnly = attr == null || typeof attr == "string" ? true : false,
			refresh = objP.refresh,
			finalAttr, ret, rowData = objP.rowData || this.getRowData(objP);
		if (!rowData) {
			return {
				attr: null
			}
		}
		if (!readOnly && refresh !== false && rowIndx == null) {
			rowIndx = this.getRowIndx({
				rowData: rowData
			}).rowIndx
		}
		if (dataIndx == null) {
			var rowattr = rowData.pq_rowattr;
			if (readOnly) {
				if (rowattr != null) {
					if (attr == null) {
						ret = rowattr
					} else {
						ret = rowattr[attr]
					}
				}
				return {
					attr: ret
				}
			}
			finalAttr = $.extend(true, rowData.pq_rowattr, attr);
			rowData.pq_rowattr = finalAttr;
			if (refresh !== false && rowIndx != null) {
				this.refreshRow({
					rowIndx: rowIndx
				})
			}
		} else {
			var cellattr = rowData.pq_cellattr;
			if (readOnly) {
				if (cellattr != null) {
					var a = cellattr[dataIndx];
					if (attr == null || a == null) {
						ret = a
					} else {
						ret = a[attr]
					}
				}
				return {
					attr: ret
				}
			}
			if (!cellattr) {
				rowData.pq_cellattr = {}
			}
			finalAttr = $.extend(true, rowData.pq_cellattr[dataIndx], attr);
			rowData.pq_cellattr[dataIndx] = finalAttr;
			if (refresh !== false && rowIndx != null) {
				this.refreshCell({
					rowIndx: rowIndx,
					dataIndx: dataIndx
				})
			}
		}
	};
	fn.processAttr = function(attr, style) {
		var key, val, str = "";
		if (typeof attr == "string") str = attr;
		else if (attr) {
			for (key in attr) {
				val = attr[key];
				if (val) {
					if (key == "title") {
						val = val.replace(/"/g, "&quot;")
					} else if (key == "style") {
						style && style.push(val);
						continue
					} else {
						if (typeof val == "object") {
							val = JSON.stringify(val)
						}
					}
					str += key + '="' + val + '"'
				}
			}
		}
		return str
	};
	fn.removeData = function(objP) {
		var colIndx = objP.colIndx,
			dataIndx = colIndx != null ? this.colModel[colIndx].dataIndx : objP.dataIndx,
			data = objP.data,
			data = data == null ? [] : data,
			datas = typeof data == "string" ? data.split(" ") : data,
			datalen = datas.length,
			rowData = objP.rowData || this.getRowData(objP);
		if (!rowData) {
			return
		}
		if (dataIndx == null) {
			var rowdata = rowData.pq_rowdata;
			if (rowdata) {
				if (datalen) {
					for (var i = 0; i < datalen; i++) {
						var key = datas[i];
						delete rowdata[key]
					}
				}
				if (!datalen || $.isEmptyObject(rowdata)) {
					delete rowData.pq_rowdata
				}
			}
		} else {
			var celldata = rowData.pq_celldata;
			if (celldata && celldata[dataIndx]) {
				var a = celldata[dataIndx];
				if (datalen) {
					for (var i = 0; i < datalen; i++) {
						var key = datas[i];
						delete a[key]
					}
				}
				if (!datalen || $.isEmptyObject(a)) {
					delete celldata[dataIndx]
				}
			}
		}
	};
	fn.removeAttr = function(objP) {
		var rowIndx = objP.rowIndx,
			dataIndx = objP.dataIndx,
			colIndx = objP.colIndx,
			dataIndx = colIndx != null ? this.colModel[colIndx].dataIndx : dataIndx,
			attr = objP.attr,
			attr = attr == null ? [] : attr,
			attrs = typeof attr == "string" ? attr.split(" ") : attr,
			attrlen = attrs.length,
			rowIndxPage = rowIndx - this.riOffset,
			refresh = objP.refresh,
			rowData = objP.rowData || this.getRowData(objP);
		if (!rowData) {
			return
		}
		if (refresh !== false && rowIndx == null) {
			rowIndx = this.getRowIndx({
				rowData: rowData
			}).rowIndx
		}
		if (dataIndx == null) {
			var rowattr = rowData.pq_rowattr;
			if (rowattr) {
				if (attrlen) {
					for (var i = 0; i < attrlen; i++) {
						var key = attrs[i];
						delete rowattr[key]
					}
				} else {
					for (key in rowattr) {
						attrs.push(key)
					}
				}
				if (!attrlen || $.isEmptyObject(rowattr)) {
					delete rowData.pq_rowattr
				}
			}
			if (refresh !== false && rowIndx != null && attrs.length) {
				attr = attrs.join(" ");
				var $tr = this.getRow({
					rowIndxPage: rowIndxPage
				});
				if ($tr) {
					$tr.removeAttr(attr)
				}
			}
		} else {
			var cellattr = rowData.pq_cellattr;
			if (cellattr && cellattr[dataIndx]) {
				var a = cellattr[dataIndx];
				if (attrlen) {
					for (i = 0; i < attrlen; i++) {
						key = attrs[i];
						delete a[key]
					}
				} else {
					for (key in a) {
						attrs.push(key)
					}
				}
				if (!attrlen || $.isEmptyObject(a)) {
					delete cellattr[dataIndx]
				}
			}
			if (refresh !== false && rowIndx != null && attrs.length) {
				attr = attrs.join(" ");
				var $td = this.getCell({
					rowIndxPage: rowIndxPage,
					dataIndx: dataIndx
				});
				if ($td) {
					$td.removeAttr(attr)
				}
			}
		}
	};
	fn.normalize = function(ui, data) {
		var obj = {},
			offset, CM, key;
		for (key in ui) {
			obj[key] = ui[key]
		}
		var ri = obj.rowIndx,
			rip = obj.rowIndxPage,
			di = obj.dataIndx,
			ci = obj.colIndx;
		if (rip != null || ri != null) {
			offset = this.riOffset;
			ri = ri == null ? rip * 1 + offset : ri;
			rip = rip == null ? ri * 1 - offset : rip;
			obj.rowIndx = ri;
			obj.rowIndxPage = rip;
			obj.rowData = obj.rowData || data && data[ri] || this.getRowData(obj)
		}
		if (ci != null || di != null) {
			CM = this.colModel;
			di = di == null ? CM[ci] ? CM[ci].dataIndx : undefined : di, ci = ci == null ? this.colIndxs[di] : ci;
			obj.column = CM[ci];
			obj.colIndx = ci;
			obj.dataIndx = di
		}
		return obj
	};
	fn.normalizeList = function(list) {
		var self = this,
			data = self.get_p_data();
		return list.map(function(rObj) {
			return self.normalize(rObj, data)
		})
	};
	fn.addClass = function(_objP) {
		var objP = this.normalize(_objP),
			rip = objP.rowIndxPage,
			dataIndx = objP.dataIndx,
			uniqueArray = pq.arrayUnique,
			objcls = objP.cls,
			newcls, refresh = objP.refresh,
			rowData = objP.rowData;
		if (!rowData) {
			return
		}
		if (refresh !== false && rip == null) {
			rip = this.getRowIndx({
				rowData: rowData
			}).rowIndxPage
		}
		if (dataIndx == null) {
			var rowcls = rowData.pq_rowcls;
			if (rowcls) {
				newcls = rowcls + " " + objcls
			} else {
				newcls = objcls
			}
			newcls = uniqueArray(newcls.split(/\s+/)).join(" ");
			rowData.pq_rowcls = newcls;
			if (refresh !== false && rip != null && this.SelectRow().inViewRow(rip)) {
				var $tr = this.getRow({
					rowIndxPage: rip
				});
				if ($tr) {
					$tr.addClass(objcls)
				}
			}
		} else {
			var dataIndxs = [];
			if (typeof dataIndx.push != "function") {
				dataIndxs.push(dataIndx)
			} else {
				dataIndxs = dataIndx
			}
			var pq_cellcls = rowData.pq_cellcls;
			if (!pq_cellcls) {
				pq_cellcls = rowData.pq_cellcls = {}
			}
			for (var j = 0, len = dataIndxs.length; j < len; j++) {
				dataIndx = dataIndxs[j];
				var cellcls = pq_cellcls[dataIndx];
				if (cellcls) {
					newcls = cellcls + " " + objcls
				} else {
					newcls = objcls
				}
				newcls = uniqueArray(newcls.split(/\s+/)).join(" ");
				pq_cellcls[dataIndx] = newcls;
				if (refresh !== false && rip != null && this.SelectRow().inViewRow(rip)) {
					var $td = this.getCell({
						rowIndxPage: rip,
						dataIndx: dataIndx
					});
					if ($td) {
						$td.addClass(objcls)
					}
				}
			}
		}
	};
	fn.removeClass = function(_objP) {
		var objP = this.normalize(_objP),
			rowIndx = objP.rowIndx,
			rowData = objP.rowData,
			dataIndx = objP.dataIndx,
			cls = objP.cls,
			refresh = objP.refresh;
		if (!rowData) {
			return
		}
		var pq_cellcls = rowData.pq_cellcls,
			pq_rowcls = rowData.pq_rowcls;
		if (refresh !== false && rowIndx == null) {
			rowIndx = this.getRowIndx({
				rowData: rowData
			}).rowIndx
		}
		if (dataIndx == null) {
			if (pq_rowcls) {
				rowData.pq_rowcls = this._removeClass(pq_rowcls, cls);
				if (rowIndx != null && refresh !== false) {
					var $tr = this.getRow({
						rowIndx: rowIndx
					});
					if ($tr) {
						$tr.removeClass(cls)
					}
				}
			}
		} else if (pq_cellcls) {
			var dataIndxs = [];
			if (typeof dataIndx.push != "function") {
				dataIndxs.push(dataIndx)
			} else {
				dataIndxs = dataIndx
			}
			for (var i = 0, len = dataIndxs.length; i < len; i++) {
				dataIndx = dataIndxs[i];
				var cellClass = pq_cellcls[dataIndx];
				if (cellClass) {
					rowData.pq_cellcls[dataIndx] = this._removeClass(cellClass, cls);
					if (rowIndx != null && refresh !== false) {
						var $td = this.getCell({
							rowIndx: rowIndx,
							dataIndx: dataIndx
						});
						if ($td) {
							$td.removeClass(cls)
						}
					}
				}
			}
		}
	};
	fn.hasClass = function(obj) {
		var dataIndx = obj.dataIndx,
			cls = obj.cls,
			rowData = this.getRowData(obj),
			re = new RegExp("\\b" + cls + "\\b"),
			str;
		if (rowData) {
			if (dataIndx == null) {
				str = rowData.pq_rowcls;
				if (str && re.test(str)) {
					return true
				} else {
					return false
				}
			} else {
				var objCls = rowData.pq_cellcls;
				if (objCls && objCls[dataIndx] && re.test(objCls[dataIndx])) {
					return true
				} else {
					return false
				}
			}
		} else {
			return null
		}
	};
	fn._removeClass = function(str, str2) {
		if (str && str2) {
			var arr = str.split(/\s+/),
				arr2 = str2.split(/\s+/),
				arr3 = [];
			for (var i = 0, len = arr.length; i < len; i++) {
				var cls = arr[i],
					found = false;
				for (var j = 0, len2 = arr2.length; j < len2; j++) {
					var cls2 = arr2[j];
					if (cls === cls2) {
						found = true;
						break
					}
				}
				if (!found) {
					arr3.push(cls)
				}
			}
			if (arr3.length > 1) {
				return arr3.join(" ")
			} else if (arr3.length === 1) {
				return arr3[0]
			} else {
				return null
			}
		}
	};
	fn.getRowIndx = function(obj) {
		var $tr = obj.$tr,
			rowData = obj.rowData,
			rowIndxPage, rowIndx, ri, offset = this.riOffset;
		if (rowData) {
			if ((ri = rowData.pq_ri) != null) {
				return {
					rowData: rowData,
					rowIndx: ri,
					rowIndxPage: ri - offset
				}
			}
			var data = this.get_p_data(),
				uf = false,
				dataUF = obj.dataUF ? this.options.dataModel.dataUF : null,
				_found = false;
			if (data) {
				for (var i = 0, len = data.length; i < len; i++) {
					if (data[i] == rowData) {
						_found = true;
						break
					}
				}
			}
			if (!_found && dataUF) {
				uf = true;
				i = 0;
				len = dataUF.length;
				for (; i < len; i++) {
					if (dataUF[i] == rowData) {
						_found = true;
						break
					}
				}
			}
			if (_found) {
				rowIndxPage = i - offset;
				rowIndx = i;
				return {
					rowIndxPage: uf ? undefined : rowIndxPage,
					uf: uf,
					rowIndx: rowIndx,
					rowData: rowData
				}
			} else {
				return {}
			}
		} else {
			if ($tr == null || $tr.length == 0) {
				return {}
			}
			rowIndxPage = this.iRenderB.getRowIndx($tr[0])[0];
			if (rowIndxPage == null) {
				return {}
			}
			return {
				rowIndxPage: rowIndxPage,
				rowIndx: rowIndxPage + offset
			}
		}
	};
	fn.search = function(ui) {
		var o = this.options,
			row = ui.row,
			first = ui.first,
			DM = o.dataModel,
			PM = o.pageModel,
			paging = PM.type,
			rowList = [],
			offset = this.riOffset,
			remotePaging = paging == "remote",
			data = DM.data;
		for (var i = 0, len = data.length; i < len; i++) {
			var rowData = data[i],
				_found = true;
			for (var dataIndx in row) {
				if (row[dataIndx] !== rowData[dataIndx]) {
					_found = false
				}
			}
			if (_found) {
				var ri = remotePaging ? i + offset : i,
					obj = this.normalize({
						rowIndx: ri
					});
				rowList.push(obj);
				if (first) {
					break
				}
			}
		}
		return rowList
	};
	fn._getFirstRC = function(view, data, freezeRows, initV, hidden) {
		var data = this[data],
			i = 0,
			fr = this.options[freezeRows],
			init = view ? this.iRenderB[initV] : fr,
			len = data.length;
		for (; i < len; i++) {
			if (i == fr) {
				i = init
			}
			if (!data[i][hidden]) {
				return i
			}
		}
	};
	fn.getFirstVisibleRIP = function(view) {
		return this._getFirstRC(view, "pdata", "freezeRows", "initV", "pq_hidden")
	};
	fn.getFirstVisibleCI = function(view) {
		return this._getFirstRC(view, "colModel", "freezeCols", "initH", "hidden")
	};
	fn.getLastVisibleRIP = function() {
		var data = this.pdata;
		for (var i = data.length - 1; i >= 0; i--) {
			if (!data[i].pq_hidden) {
				return i
			}
		}
		return null
	};
	fn.getLastVisibleCI = function() {
		return this.iCols.getLastVisibleCI()
	};
	fn.getNextVisibleCI = function(ci) {
		return this.iCols.getNextVisibleCI(ci)
	};
	fn.getPrevVisibleCI = function(ci) {
		return this.iCols.getPrevVisibleCI(ci)
	};
	fn.getPrevVisibleRIP = function(rip) {
		return this.iKeys.getPrevVisibleRIP(rip)
	};
	fn.getNextVisibleRIP = function(rip) {
		return this.iKeys.getNextVisibleRIP(rip)
	};
	fn.calcWidthCols = function(colIndx1, colIndx2) {
		var wd = 0,
			o = this.options,
			column, numberCell = o.numberCell,
			CM = this.colModel;
		if (colIndx1 == -1) {
			if (numberCell.show) {
				wd += numberCell.width * 1
			}
			colIndx1 = 0
		}
		for (var i = colIndx1; i < colIndx2; i++) {
			column = CM[i];
			if (column && !column.hidden) {
				if (!column._width) {
					throw "assert failed"
				}
				wd += column._width
			}
		}
		return wd
	}
})(jQuery);
(function($) {
	var cKeyNav = $.paramquery.cKeyNav = function(that) {
		this.that = that
	};
	cKeyNav.prototype = {
		bodyKeyPressDown: function(evt) {
			var self = this,
				that = self.that,
				offset = that.riOffset,
				rowIndx, rowIndxPage, colIndx, o = that.options,
				rtl = o.rtl,
				FM = o.formulasModel,
				iM = that.iMerge,
				_fe = that._focusEle,
				CM = that.colModel,
				SM = o.selectionModel,
				EM = o.editModel,
				ac = document.activeElement,
				$target, ctrlMeta = pq.isCtrl(evt),
				KC = $.ui.keyCode,
				KCLEFT = KC.LEFT,
				KCRIGHT = KC.RIGHT,
				KCTAB = KC.TAB,
				keyCode = evt.keyCode;
			if (EM.indices) {
				that.$div_focus.find(".pq-cell-focus").focus();
				return
			}
			$target = $(evt.target);
			if ($target.hasClass("pq-grid-cell")) {
				_fe = that.getCellIndices({
					$td: $target
				})
			} else {
				if (ac.id != "pq-grid-excel" && ac.className != "pq-body-outer") {
					return
				}
			}
			if (keyCode == KC.SPACE && $target[0] == that.$cont[0]) {
				return false
			}
			var cell = that.normalize(_fe),
				rowIndxPage = cell.rowIndxPage,
				rowIndx = cell.rowIndx,
				colIndx = cell.colIndx,
				pqN, rip2, pdata = that.pdata,
				uiTrigger = cell,
				preventDefault = true;
			if (rowIndx == null || colIndx == null || cell.rowData == null) {
				return
			}
			if (iM.ismergedCell(rowIndx, colIndx)) {
				uiTrigger = iM.getRootCellO(rowIndx, colIndx);
				cell = uiTrigger;
				rowIndxPage = cell.rowIndxPage;
				rowIndx = cell.rowIndx;
				colIndx = cell.colIndx;
				if ([KC.PAGE_UP, KC.PAGE_DOWN, KC.HOME, KC.END].indexOf(keyCode) >= 0) {
					if (pqN = iM.getData(rowIndx, colIndx, "proxy_cell")) {
						rip2 = pqN.rowIndx - offset;
						if (!pdata[rip2].pq_hidden) {
							rowIndxPage = rip2;
							rowIndx = rowIndxPage + offset
						}
					}
				}
				if (CM[colIndx].hidden) {
					colIndx = that.getNextVisibleCI(colIndx)
				}
			}
			if (that._trigger("beforeCellKeyDown", evt, uiTrigger) == false) {
				return false
			}
			that._trigger("cellKeyDown", evt, uiTrigger);
			if (keyCode == KCLEFT || keyCode == KCRIGHT || keyCode == KC.UP || keyCode == KC.DOWN || SM.onTab && keyCode == KCTAB) {
				var obj = null;
				if (keyCode == KCLEFT && !rtl || keyCode == KCRIGHT && rtl || keyCode == KCTAB && evt.shiftKey) {
					obj = this.incrIndx(rowIndxPage, colIndx, false)
				} else if (keyCode == KCRIGHT && !rtl || keyCode == KCLEFT && rtl || keyCode == KCTAB && !evt.shiftKey) {
					obj = this.incrIndx(rowIndxPage, colIndx, true)
				} else if (keyCode == KC.UP) {
					obj = this.incrRowIndx(rowIndxPage, colIndx, false)
				} else if (keyCode == KC.DOWN) {
					obj = this.incrRowIndx(rowIndxPage, colIndx, true)
				}
				if (obj) {
					rowIndx = obj.rowIndxPage + offset;
					this.select({
						rowIndx: rowIndx,
						colIndx: obj.colIndx,
						evt: evt
					})
				}
			} else if (keyCode == KC.PAGE_DOWN || keyCode == KC.PAGE_UP) {
				var fn = keyCode == KC.PAGE_UP ? "pageUp" : "pageDown";
				that.iRenderB[fn](rowIndxPage, function(rip) {
					rowIndx = rip + offset;
					self.select({
						rowIndx: rowIndx,
						colIndx: colIndx,
						evt: evt
					})
				})
			} else if (keyCode == KC.HOME) {
				if (ctrlMeta) {
					rowIndx = that.getFirstVisibleRIP() + offset
				} else {
					colIndx = that.getFirstVisibleCI()
				}
				this.select({
					rowIndx: rowIndx,
					colIndx: colIndx,
					evt: evt
				})
			} else if (keyCode == KC.END) {
				if (ctrlMeta) {
					rowIndx = that.getLastVisibleRIP() + offset
				} else {
					colIndx = that.getLastVisibleCI()
				}
				this.select({
					rowIndx: rowIndx,
					colIndx: colIndx,
					evt: evt
				})
			} else if (keyCode == KC.ENTER) {
				var $td = that.getCell(uiTrigger);
				if ($td && $td.length > 0) {
					if (that.isEditable(uiTrigger)) {
						that.editCell(uiTrigger)
					} else {
						var $button = $td.find("button");
						if ($button.length) {
							$($button[0]).click()
						}
					}
				}
			} else if (ctrlMeta && keyCode == "65") {
				var iSel = that.iSelection;
				if (SM.type == "row" && SM.mode != "single") {
					that.iRows.toggleAll({
						all: SM.all
					})
				} else if (SM.type == "cell" && SM.mode != "single") {
					iSel.selectAll({
						type: "cell",
						all: SM.all
					})
				}
			} else if (EM.pressToEdit && (this.isEditKey(keyCode) || FM.on && keyCode == 187) && !ctrlMeta) {
				if (keyCode == 46) {
					that.clear()
				} else {
					rowIndxPage = uiTrigger.rowIndxPage;
					colIndx = uiTrigger.colIndx;
					$td = that.getCell(uiTrigger);
					if ($td && $td.length) {
						if (that.isEditable(uiTrigger)) {
							that.editCell({
								rowIndxPage: rowIndxPage,
								colIndx: colIndx,
								select: true
							})
						}
					}
					preventDefault = false
				}
			} else {
				preventDefault = false
			}
			if (preventDefault) {
				evt.preventDefault()
			}
		},
		getPrevVisibleRIP: function(rowIndxPage) {
			var data = this.that.pdata;
			for (var i = rowIndxPage - 1; i >= 0; i--) {
				if (!data[i].pq_hidden) {
					return i
				}
			}
			return rowIndxPage
		},
		setDataMergeCell: function(rowIndx, colIndx) {
			var that = this.that,
				iM = that.iMerge,
				obj, obj_o;
			if (iM.ismergedCell(rowIndx, colIndx)) {
				obj_o = iM.getRootCellO(rowIndx, colIndx);
				iM.setData(obj_o.rowIndx, obj_o.colIndx, {
					proxy_cell: {
						rowIndx: rowIndx,
						colIndx: colIndx
					}
				})
			}
		},
		getValText: function($editor) {
			var nodeName = $editor[0].nodeName.toLowerCase(),
				valsarr = ["input", "textarea", "select"],
				byVal = "text";
			if ($.inArray(nodeName, valsarr) != -1) {
				byVal = "val"
			}
			return byVal
		},
		getNextVisibleRIP: function(rowIndxPage) {
			var data = this.that.pdata;
			for (var i = rowIndxPage + 1, len = data.length; i < len; i++) {
				if (!data[i].pq_hidden) {
					return i
				}
			}
			return rowIndxPage
		},
		incrEditIndx: function(rowIndxPage, colIndx, incr) {
			var that = this.that,
				CM = that.colModel,
				CMLength = CM.length,
				iM = that.iMerge,
				column, offset = that.riOffset,
				lastRowIndxPage = that[incr ? "getLastVisibleRIP" : "getFirstVisibleRIP"]();
			do {
				var rowIndx = rowIndxPage + offset,
					m;
				if (iM.ismergedCell(rowIndx, colIndx)) {
					m = iM.getRootCell(rowIndx, colIndx);
					var pqN = iM.getData(rowIndx, colIndx, "proxy_edit_cell");
					if (pqN) {
						rowIndx = pqN.rowIndx;
						rowIndxPage = rowIndx - offset
					}
					colIndx = incr ? colIndx + m.o_cc : colIndx - 1
				} else {
					colIndx = incr ? colIndx + 1 : colIndx - 1
				}
				if (incr && colIndx >= CMLength || !incr && colIndx < 0) {
					if (rowIndxPage == lastRowIndxPage) {
						return null
					}
					rowIndxPage = this[incr ? "getNextVisibleRIP" : "getPrevVisibleRIP"](rowIndxPage);
					colIndx = incr ? 0 : CMLength - 1
				}
				rowIndx = rowIndxPage + offset;
				if (iM.ismergedCell(rowIndx, colIndx)) {
					m = iM.getRootCellO(rowIndx, colIndx);
					iM.setData(m.rowIndx, m.colIndx, {
						proxy_edit_cell: {
							rowIndx: rowIndx,
							colIndx: colIndx
						}
					});
					rowIndx = m.rowIndx;
					colIndx = m.colIndx
				}
				column = CM[colIndx];
				var isEditableCell = that.isEditable({
						rowIndx: rowIndx,
						colIndx: colIndx
					}),
					ceditor = column.editor,
					ceditor = typeof ceditor == "function" ? ceditor.call(that, that.normalize({
						rowIndx: rowIndx,
						colIndx: colIndx
					})) : ceditor;
				rowIndxPage = rowIndx - offset
			} while (column && (column.hidden || isEditableCell == false || ceditor === false));
			return {
				rowIndxPage: rowIndxPage,
				colIndx: colIndx
			}
		},
		incrIndx: function(rowIndxPage, colIndx, incr) {
			var that = this.that,
				iM = that.iMerge,
				m, pqN, rowIndx, rip2, column, pdata = that.pdata,
				offset = that.riOffset,
				lastRowIndxPage = that[incr ? "getLastVisibleRIP" : "getFirstVisibleRIP"](),
				lastColIndx = that[incr ? "getLastVisibleCI" : "getFirstVisibleCI"](),
				CM = that.colModel,
				CMLength = CM.length;
			if (colIndx == null) {
				if (rowIndxPage == lastRowIndxPage) {
					return null
				}
				rowIndxPage = this[incr ? "getNextVisibleRIP" : "getPrevVisibleRIP"](rowIndxPage);
				return {
					rowIndxPage: rowIndxPage
				}
			} else if (colIndx == lastColIndx) {
				return {
					rowIndxPage: rowIndxPage,
					colIndx: colIndx
				}
			}
			do {
				rowIndx = rowIndxPage + offset;
				if (iM.ismergedCell(rowIndx, colIndx)) {
					m = iM.getRootCell(rowIndx, colIndx);
					if (!column && (pqN = iM.getData(m.o_ri, m.o_ci, "proxy_cell"))) {
						rip2 = pqN.rowIndx - offset;
						if (!pdata[rip2].pq_hidden) {
							rowIndxPage = rip2
						}
					}
					if (pdata[rowIndxPage].pq_hidden) {
						rowIndxPage = iM.getRootCellV(rowIndx, colIndx).rowIndxPage
					}
					if (!column && incr) {
						colIndx = m.o_ci + (m.o_cc ? m.o_cc - 1 : 0)
					}
				}
				if (incr) {
					if (colIndx < CMLength - 1) colIndx++
				} else {
					if (colIndx > 0) colIndx--
				}
				column = CM[colIndx]
			} while (column && column.hidden);
			return {
				rowIndxPage: rowIndxPage,
				colIndx: colIndx
			}
		},
		incrRowIndx: function(rip, ci, incr) {
			var that = this.that,
				offset = that.riOffset,
				ri = rip + offset,
				iM = that.iMerge,
				m, pqN;
			if (iM.ismergedCell(ri, ci)) {
				m = iM.getRootCell(ri, ci);
				pqN = iM.getData(m.o_ri, m.o_ci, "proxy_cell");
				if (incr) rip = m.o_ri - offset + m.o_rc - 1;
				ci = pqN ? pqN.colIndx : m.v_ci
			}
			rip = this[incr ? "getNextVisibleRIP" : "getPrevVisibleRIP"](rip);
			return {
				rowIndxPage: rip,
				colIndx: ci
			}
		},
		isEditKey: function(keyCode) {
			return keyCode >= 32 && keyCode <= 127 || keyCode == 189 || keyCode == 190
		},
		keyDownInEdit: function(evt) {
			var that = this.that,
				o = that.options,
				EMIndx = o.editModel.indices;
			if (!EMIndx) {
				return
			}
			var $this = $(evt.target),
				keyCodes = $.ui.keyCode,
				gEM = o.editModel,
				obj = $.extend({}, EMIndx),
				rowIndxPage = obj.rowIndxPage,
				colIndx = obj.colIndx,
				column = obj.column,
				cEM = column.editModel,
				EM = cEM ? $.extend({}, gEM, cEM) : gEM,
				byVal = this.getValText($this);
			$this.data("oldVal", $this[byVal]());
			if (that._trigger("editorKeyDown", evt, obj) == false) {
				return false
			}
			if (evt.keyCode == keyCodes.TAB || evt.keyCode == EM.saveKey && !evt.altKey) {
				var onSave = evt.keyCode == keyCodes.TAB ? EM.onTab : EM.onSave;
				if (onSave == "downFocus") obj = this.incrRowIndx(rowIndxPage, colIndx, !evt.shiftKey);
				else {
					obj = {
						rowIndxPage: rowIndxPage,
						colIndx: colIndx,
						incr: onSave ? true : false,
						edit: onSave == "nextEdit"
					}
				}
				if ($this.hasClass("ui-autocomplete-input") && $this.autocomplete("widget").is(":visible")) return;
				return this.saveAndMove(obj, evt)
			} else if (evt.keyCode == keyCodes.ESCAPE) {
				that.quitEditMode({
					evt: evt
				});
				that.focus({
					rowIndxPage: rowIndxPage,
					colIndx: colIndx
				});
				evt.preventDefault();
				return false
			} else if (evt.keyCode == keyCodes.PAGE_UP || evt.keyCode == keyCodes.PAGE_DOWN) {
				evt.preventDefault();
				return false
			} else if (EM.keyUpDown && !evt.altKey) {
				if (evt.keyCode == keyCodes.DOWN || evt.keyCode == keyCodes.UP) {
					obj = this.incrRowIndx(rowIndxPage, colIndx, evt.keyCode == keyCodes.DOWN);
					return this.saveAndMove(obj, evt)
				}
			}
		},
		keyPressInEdit: function(evt, _objP) {
			var that = this.that,
				o = that.options,
				EM = o.editModel,
				EMIndx = EM.indices,
				objP = _objP || {},
				FK = objP.FK,
				column = EMIndx.column,
				KC = $.ui.keyCode,
				allowedKeys = ["BACKSPACE", "LEFT", "RIGHT", "UP", "DOWN", "DELETE", "HOME", "END"].map(function(kc) {
					return KC[kc]
				}),
				dataType = column.dataType;
			if ($.inArray(evt.keyCode, allowedKeys) >= 0) {
				return true
			}
			if (that._trigger("editorKeyPress", evt, $.extend({}, EMIndx)) === false) {
				return false
			}
			if (FK && (dataType == "float" || dataType == "integer")) {
				var val = EMIndx.$editor.val(),
					charsAllow = EM.charsAllow[dataType == "float" ? 0 : 1],
					charC = evt.charCode || evt.keyCode,
					chr = String.fromCharCode(charC);
				if (val[0] !== "=" && chr && charsAllow.indexOf(chr) == -1) {
					return false
				}
			}
			return true
		},
		keyUpInEdit: function(evt, _objP) {
			var that = this.that,
				o = that.options,
				objP = _objP || {},
				FK = objP.FK,
				EM = o.editModel,
				EMIndices = EM.indices;
			that._trigger("editorKeyUp", evt, $.extend({}, EMIndices));
			var column = EMIndices.column,
				dataType = column.dataType;
			if (FK && (dataType == "float" || dataType == "integer")) {
				var $this = $(evt.target),
					re = dataType == "integer" ? EM.reInt : EM.reFloat,
					byVal = this.getValText($this),
					oldVal = $this.data("oldVal"),
					newVal = $this[byVal]();
				if (re.test(newVal) == false && newVal[0] !== "=") {
					if (re.test(oldVal)) {
						$this[byVal](oldVal)
					} else {
						var val = dataType == "float" ? parseFloat(oldVal) : parseInt(oldVal);
						if (isNaN(val)) {
							$this[byVal](0)
						} else {
							$this[byVal](val)
						}
					}
				}
			}
		},
		saveAndMove: function(objP, evt) {
			if (objP == null) {
				evt.preventDefault();
				return false
			}
			var self = this,
				that = self.that,
				rowIndx, obj, rowIndxPage = objP.rowIndxPage,
				colIndx = objP.colIndx;
			that._blurEditMode = true;
			if (that.saveEditCell({
					evt: evt
				}) === false || !that.pdata) {
				if (!that.pdata) {
					that.quitEditMode(evt)
				}
				that._deleteBlurEditMode({
					timer: true,
					msg: "saveAndMove saveEditCell"
				});
				evt.preventDefault();
				return false
			}
			that.quitEditMode(evt);
			if (objP.incr) {
				obj = self[objP.edit ? "incrEditIndx" : "incrIndx"](rowIndxPage, colIndx, !evt.shiftKey);
				rowIndxPage = obj ? obj.rowIndxPage : rowIndxPage;
				colIndx = obj ? obj.colIndx : colIndx
			}
			that.scrollCell({
				rowIndxPage: rowIndxPage,
				colIndx: colIndx
			}, function() {
				rowIndx = rowIndxPage + that.riOffset;
				self.select({
					rowIndx: rowIndx,
					colIndx: colIndx,
					evt: evt
				});
				if (objP.edit) {
					that._editCell({
						rowIndxPage: rowIndxPage,
						colIndx: colIndx
					})
				}
			});
			that._deleteBlurEditMode({
				timer: true,
				msg: "saveAndMove"
			});
			evt.preventDefault();
			return false
		},
		select: function(_objP) {
			var self = this,
				that = self.that,
				rowIndx = _objP.rowIndx,
				colIndx = _objP.colIndx,
				rowIndxPage = rowIndx - that.riOffset,
				evt = _objP.evt,
				objP = self.setDataMergeCell(rowIndx, colIndx),
				o = that.options,
				iSel = that.iSelection,
				SM = o.selectionModel,
				type = SM.type,
				type_row = type == "row",
				type_cell = type == "cell";
			that.scrollCell({
				rowIndx: rowIndx,
				colIndx: colIndx
			}, function() {
				var areas = iSel.address();
				if (evt.shiftKey && evt.keyCode !== $.ui.keyCode.TAB && SM.type && SM.mode != "single" && (areas.length || type_row)) {
					if (type_row) {
						that.iRows.extend({
							rowIndx: rowIndx,
							evt: evt
						})
					} else {
						var last = areas[areas.length - 1],
							firstR = last.firstR,
							firstC = last.firstC,
							lasttype = last.type,
							expand = false;
						if (lasttype == "column") {
							last.c1 = firstC;
							last.c2 = colIndx;
							last.r1 = last.r2 = last.type = last.cc = last.rc = undefined;
							that.Range(areas, expand).select()
						} else if (lasttype == "row") {
							iSel.resizeOrReplace({
								r1: firstR,
								r2: rowIndx,
								firstR: firstR,
								firstC: firstC
							})
						} else {
							iSel.resizeOrReplace({
								r1: firstR,
								c1: firstC,
								r2: rowIndx,
								c2: colIndx,
								firstR: firstR,
								firstC: firstC
							})
						}
					}
				} else {
					if (type_row) {} else if (type_cell) {
						that.Range({
							r1: rowIndx,
							c1: colIndx,
							firstR: rowIndx,
							firstC: colIndx
						}).select()
					}
				}
				that.focus({
					rowIndxPage: rowIndxPage,
					colIndx: colIndx
				})
			})
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		cGenerateView = _pq.cGenerateView = function() {};
	cGenerateView.prototype = {
		autoFitCols: function() {
			var that = this.that,
				CM = that.colModel,
				CMLength = CM.length,
				dims = this.dims,
				wdAllCols = that.calcWidthCols(-1, CMLength, true),
				sbWidth = this.getSBWd(),
				wdCont = dims.wdCenter - sbWidth;
			if (wdAllCols !== wdCont) {
				var diff = wdAllCols - wdCont,
					columnResized, availWds = [];
				for (var i = 0; i < CMLength; i++) {
					var column = CM[i],
						colPercent = column._percent,
						resizable = column.resizable !== false,
						resized = column._resized,
						hidden = column.hidden;
					if (!hidden && !colPercent && !resized) {
						var availWd;
						if (diff < 0) {
							availWd = column._maxWidth - column._width;
							if (availWd) {
								availWds.push({
									availWd: -1 * availWd,
									colIndx: i
								})
							}
						} else {
							availWd = column._width - column._minWidth;
							if (availWd) {
								availWds.push({
									availWd: availWd,
									colIndx: i
								})
							}
						}
					}
					if (resized) {
						columnResized = column;
						delete column._resized
					}
				}
				availWds.sort(function(obj1, obj2) {
					if (obj1.availWd > obj2.availWd) {
						return 1
					} else if (obj1.availWd < obj2.availWd) {
						return -1
					} else {
						return 0
					}
				});
				for (var i = 0, len = availWds.length; i < len; i++) {
					var obj = availWds[i],
						availWd = obj.availWd,
						colIndx = obj.colIndx,
						part = Math.round(diff / (len - i)),
						column = CM[colIndx],
						wd, colWd = column._width;
					if (Math.abs(availWd) > Math.abs(part)) {
						wd = colWd - part;
						diff = diff - part
					} else {
						wd = colWd - availWd;
						diff = diff - availWd
					}
					column.width = column._width = wd
				}
				if (diff != 0 && columnResized) {
					var wd = columnResized._width - diff;
					if (wd > columnResized._maxWidth) {
						wd = columnResized._maxWidth
					} else if (wd < columnResized._minWidth) {
						wd = columnResized._minWidth
					}
					columnResized.width = columnResized._width = wd
				}
			}
		},
		numericVal: function(width, totalWidth) {
			var val;
			if ((width + "").indexOf("%") > -1) {
				val = parseInt(width) * totalWidth / 100
			} else {
				val = parseInt(width)
			}
			return Math.round(val)
		},
		refreshColumnWidths: function(ui) {
			ui = ui || {};
			var that = this.that,
				o = that.options,
				numberCell = o.numberCell,
				flexWidth = o.width === "flex",
				cbWidth = 0,
				CM = that.colModel,
				autoFit = this.autoFit,
				contWd = this.dims.wdCenter,
				CMLength = CM.length,
				sbWidth = 0,
				minColWidth = o.minColWidth,
				maxColWidth = o.maxColWidth;
			var numberCellWidth = 0;
			if (numberCell.show) {
				if (numberCell.width < numberCell.minWidth) {
					numberCell.width = numberCell.minWidth
				}
				numberCellWidth = numberCell.outerWidth = numberCell.width
			}
			var availWidth = flexWidth ? null : contWd - sbWidth - numberCellWidth,
				minColWidth = Math.floor(this.numericVal(minColWidth, availWidth)),
				maxColWidth = Math.ceil(this.numericVal(maxColWidth, availWidth)),
				rem = 0;
			if (!flexWidth && availWidth < 5 || isNaN(availWidth)) {
				if (o.debug) {
					throw "availWidth N/A";
				}
				return
			}
			delete that.percentColumn;
			for (var i = 0; i < CMLength; i++) {
				var column = CM[i],
					hidden = column.hidden;
				if (hidden) {
					continue
				}
				var colWidth = column.width,
					colWidthPercent = (colWidth + "").indexOf("%") > -1 ? true : null,
					colMinWidth = column.minWidth,
					colMaxWidth = column.maxWidth,
					colMinWidth = colMinWidth ? this.numericVal(colMinWidth, availWidth) : minColWidth,
					colMaxWidth = colMaxWidth ? this.numericVal(colMaxWidth, availWidth) : maxColWidth;
				if (colMaxWidth < colMinWidth) {
					colMaxWidth = colMinWidth
				}
				if (colWidth != undefined) {
					var wdFrac, wd = 0;
					if (!flexWidth && colWidthPercent) {
						that.percentColumn = true;
						column.resizable = false;
						column._percent = true;
						wdFrac = this.numericVal(colWidth, availWidth) - cbWidth;
						wd = Math.floor(wdFrac);
						rem += wdFrac - wd;
						if (rem >= 1) {
							wd += 1;
							rem -= 1
						}
					} else if (colWidth) {
						wd = colWidth * 1
					}
					if (wd < colMinWidth) {
						wd = colMinWidth
					} else if (wd > colMaxWidth) {
						wd = colMaxWidth
					}
					column._width = wd
				} else {
					column._width = colMinWidth
				}
				if (!colWidthPercent) {
					column.width = column._width
				}
				column._minWidth = colMinWidth;
				column._maxWidth = flexWidth ? 1e3 : colMaxWidth
			}
			if (flexWidth === false && ui.refreshWidth !== false) {
				if (autoFit) {
					this.autoFitCols()
				}
			}
		},
		format: function() {
			var dp = $.datepicker,
				formatNumber = pq.formatNumber;
			return function(cellData, format) {
				if (typeof format == "function") {
					return format(cellData)
				}
				if (pq.isDateFormat(format)) {
					if (cellData == parseInt(cellData)) {
						return pq.formulas.TEXT(cellData, pq.juiToExcel(format))
					} else if (isNaN(Date.parse(cellData))) {
						return
					}
					return dp.formatDate(format, new Date(cellData))
				} else if (cellData == parseFloat(cellData)) {
					return formatNumber(cellData, format)
				}
			}
		}(),
		renderCell: function(objP) {
			var self = this,
				that = self.that,
				attr = objP.attr || [],
				style = objP.style || [],
				dattr, dstyle, dcls, dprop, Export = objP.Export,
				o = that.options,
				cls = objP.cls || [],
				rowData = objP.rowData,
				column = objP.column,
				dataType = column.dataType,
				colIndx = objP.colIndx,
				align, styleStr = pq.styleStr,
				processAttr = that.processAttr,
				dataIndx = column.dataIndx,
				colStyle = column.style || {},
				cellstyle, rowstyle = rowData.pq_rowstyle,
				cellattr, cellcls, cellprop = (rowData.pq_cellprop || {})[dataIndx] || {},
				rowprop = rowData.pq_rowprop || {},
				freezeCols = o.freezeCols,
				render, columnBorders = o.columnBorders;
			if (!rowData) {
				return
			}
			if (!Export) {
				colStyle && style.push(styleStr(colStyle));
				rowstyle && style.push(styleStr(rowstyle));
				cellstyle = (rowData.pq_cellstyle || {})[dataIndx];
				cellstyle && style.push(styleStr(cellstyle));
				if (colIndx == freezeCols - 1 && columnBorders) {
					cls.push("pq-last-frozen-col")
				}
				column.cls && cls.push(column.cls);
				if (o.editModel.addDisableCls && that.isEditable(objP) === false) {
					cls.push("pq-cell-disable")
				}
			}
			var dataCell, cellData = rowData[dataIndx],
				cellData = typeof cellData == "string" && dataType != "html" ? pq.escapeHtml(cellData) : cellData,
				_cf = o.format.call(that, rowData, column, cellprop, rowprop),
				formatVal = _cf ? this.format(cellData, _cf, dataType) : cellData;
			objP.dataIndx = dataIndx;
			objP.cellData = cellData;
			objP.formatVal = formatVal;
			if (render = column.render) {
				dataCell = that.callFn(render, objP);
				if (dataCell && typeof dataCell != "string") {
					(dattr = dataCell.attr) && attr.push(processAttr(dattr));
					dprop = dataCell.prop;
					(dcls = dataCell.cls) && cls.push(dcls);
					(dstyle = dataCell.style) && style.push(styleStr(dstyle));
					dataCell = dataCell.text
				}
			}
			if (dataCell == null && (render = column._renderG || column._render)) {
				dataCell = render.call(that, objP)
			}
			if (dataCell && typeof dataCell != "string") {
				(dattr = dataCell.attr) && attr.push(dattr);
				(dcls = dataCell.cls) && cls.push(dcls);
				(dstyle = dataCell.style) && style.push(styleStr(dstyle));
				dataCell = dataCell.text
			}
			if (dataCell == null) {
				dataCell = formatVal || cellData
			}
			if (Export) {
				return [dataCell, dstyle, dprop, (dattr || {}).title]
			} else {
				dprop = dprop || {};
				if (align = dprop.align || cellprop.align || rowprop.align || column.align) cls.push("pq-align-" + align);
				if (align = dprop.valign || cellprop.valign || rowprop.valign || column.valign) cls.push("pq-valign-" + align);
				cellcls = (rowData.pq_cellcls || {})[dataIndx];
				if (cellcls) {
					cls.push(cellcls)
				}
				cellattr = (rowData.pq_cellattr || {})[dataIndx];
				if (cellattr) {
					attr.push(processAttr(cellattr, style))
				}
				style = style.length ? " style='" + style.join("") + "' " : "";
				dataCell = pq.newLine(dataCell);
				var str = ["<div class='", cls.join(" "), "' ", attr.join(" "), style, " ><div>", dataCell, "</div></div>"].join("");
				return str
			}
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		fn = _pq._pqGrid.prototype;
	fn.getHeadCell = function($td) {
		var arr = this.iRenderHead.getCellIndx($td[0]),
			ri = arr[0],
			ci = arr[1],
			isParent, column, cCM;
		if (ci != null && ri != null) {
			column = this.headerCells[ri];
			column && (column = column[ci]);
			if (column) {
				cCM = column.colModel
			}
		}
		if (cCM && cCM.length) {
			isParent = true
		}
		return {
			col: column || this.colModel[ci],
			ci: ci,
			ri: ri,
			isParent: isParent
		}
	};
	fn.flex = function(ui) {
		var colIndxs = this.colIndxs;
		if (ui && ui.dataIndx) {
			ui.colIndx = ui.dataIndx.map(function(di) {
				return colIndxs[di]
			})
		}
		this.iResizeColumns.flex(ui)
	};
	_pq.cHeader = function(that, $h) {};
	_pq.cHeader.prototype = {
		colCollapse: function(column, evt) {
			var that = this.that,
				ui = {
					column: column
				},
				collapsible = column.collapsible;
			if (that._trigger("beforeColumnCollapse", evt, ui) !== false) {
				collapsible.on = !collapsible.on;
				if (that._trigger("columnCollapse", evt, ui) !== false) {
					that.refresh({
						colModel: true
					})
				}
			}
		},
		onHeaderClick: function(evt) {
			var self = this,
				that = self.that,
				$td, column, obj, $target, iDG = that.iDragColumns;
			that._trigger("headerClick", evt);
			if (iDG && iDG.status != "stop") {
				return
			}
			$target = $(evt.target);
			if ($target.is("input,label")) {
				return true
			}
			$td = $target.closest(".pq-grid-col");
			if ($td.length) {
				obj = that.getHeadCell($td);
				column = obj.col;
				if ($target.hasClass("pq-col-collapse")) {
					self.colCollapse(column, evt)
				} else if (!obj.isParent) {
					return self.onHeaderCellClick(column, obj.ci, evt)
				}
			}
		},
		getTitle: function(column, ci) {
			var title = column.title,
				t = typeof title == "function" ? title.call(this.that, {
					column: column,
					colIndx: ci,
					dataIndx: column.dataIndx
				}) : title;
			return t
		},
		createHeaderCell: function(objP) {
			var self = this,
				that = self.that,
				o = that.options,
				cls = objP.cls,
				style = objP.style,
				attr = objP.attr,
				column = objP.column,
				colIndx = objP.colIndx,
				SSS = self.getSortSpaceSpans(o.sortModel),
				collapsedStr, collapsible = column.collapsible,
				styleStr = pq.styleStr,
				align = column.halign || column.align,
				hvalign = column.hvalign,
				ccls = column.cls,
				tmp, cm = column.colModel,
				hasMenuH = self.hasMenuH(o, column),
				title = self.getTitle(column, colIndx),
				title = title != null ? title : column.dataIndx;
			if (align) cls.push("pq-align-" + align);
			if (hvalign) cls.push("pq-valign-" + hvalign);
			if (tmp = column.styleHead) style.push(styleStr(tmp));
			if (tmp = column.attrHead) attr.push(that.processAttr(tmp));
			if (ccls) cls.push(ccls);
			cls.push(column.clsHead);
			if (hasMenuH) cls.push("pq-has-menu");
			if (!cm || !cm.length) {
				cls.push("pq-grid-col-leaf")
			} else {
				if (collapsible) {
					cls.push("pq-collapsible-th");
					collapsedStr = ["<span class='pq-col-collapse pq-icon-hover ui-icon ui-icon-", collapsible.on ? "plus" : "minus", "'></span>"].join("")
				}
			}
			attr.push("pq-row-indx=" + objP.rowIndx + " pq-col-indx=" + objP.colIndx);
			column.pq_title = title;
			return ["<div ", attr.join(" "), " ", " class='", cls.join(" "), "' style='", style.join(""), "' >", "<div class='pq-td-div'>", collapsedStr, "<span class='pq-title-span'>", title, "</span>", SSS, "</div>", hasMenuH ? "<span class='pq-menu-icon'></span>" : "", "</div>"].join("")
		},
		getSortSpaceSpans: function(SM) {
			var pq_space = SM.space ? " pq-space" : "";
			return ["<span class='pq-col-sort-icon", pq_space, "'></span>", SM.number ? "<span class='pq-col-sort-count" + pq_space + "'></span>" : ""].join("")
		},
		hasMenuH: function(o, column) {
			var CM = column.colModel;
			if (CM && CM.length) {
				return false
			}
			var omenuH = o.menuIcon,
				colmenuH = column.menuIcon;
			return omenuH && colmenuH !== false || omenuH !== false && colmenuH
		},
		onHeaderCellClick: function(column, colIndx, evt) {
			var that = this.that,
				o = that.options,
				SM = o.sortModel,
				dataIndx = column.dataIndx;
			if (that._trigger("headerCellClick", evt, {
					column: column,
					colIndx: colIndx,
					dataIndx: dataIndx
				}) === false) {
				return
			}
			if (o.selectionModel.column && evt.target.className.indexOf("pq-title-span") == -1) {
				var firstVisibleRIP = that.getFirstVisibleRIP(),
					address = {
						c1: colIndx,
						firstC: colIndx,
						firstR: firstVisibleRIP
					},
					iSel = that.iSelection,
					oldaddress = iSel.address(),
					alen = oldaddress.length;
				if (pq.isCtrl(evt)) {
					iSel.add(address)
				} else {
					if (evt.shiftKey) {
						if (alen && oldaddress[alen - 1].type == "column") {
							var last = oldaddress[alen - 1];
							last.c1 = last.firstC;
							last.c2 = colIndx;
							last.r1 = last.r2 = last.type = last.cc = undefined
						}
						address = oldaddress
					}
					that.Range(address, false).select()
				}
				that.focus({
					rowIndxPage: that.getFirstVisibleRIP(true),
					colIndx: colIndx
				});
				that._trigger("mousePQUp")
			} else if (SM.on && (SM.wholeCell || $(evt.target).hasClass("pq-title-span"))) {
				if (column.sortable == false) {
					return
				}
				that.sort({
					sorter: [{
						dataIndx: dataIndx,
						sortIndx: column.sortIndx
					}],
					addon: true,
					skipCustomSort: pq.isCtrl(evt),
					tempMultiple: SM.multiKey && evt[SM.multiKey],
					evt: evt
				})
			}
		},
		refreshHeaderSortIcons: function() {
			var that = this.that,
				o = that.options,
				BS = o.bootstrap,
				jui = o.ui,
				ri = that.headerCells.length - 1,
				$header = that.$header;
			if (!$header) {
				return
			}
			var sorters = that.iSort.getSorter(),
				sorterLen = sorters.length,
				number = false,
				SM = that.options.sortModel;
			if (SM.number && sorterLen > 1) {
				number = true
			}
			for (var i = 0; i < sorterLen; i++) {
				var sorter = sorters[i],
					dataIndx = sorter.dataIndx,
					ci = that.getColIndx({
						dataIndx: dataIndx
					}),
					dir = sorter.dir;
				if (ci >= 0) {
					var addClass = BS.on ? BS.header_active : jui.header_active + " pq-col-sort-" + (dir == "up" ? "asc" : "desc"),
						cls2 = BS.on ? " glyphicon glyphicon-arrow-" + dir : "ui-icon ui-icon-triangle-1-" + (dir == "up" ? "n" : "s"),
						$th = $(that.iRenderHead.getCell(ri, ci));
					$th.addClass(addClass);
					$th.find(".pq-col-sort-icon").addClass(cls2);
					if (number) {
						$th.find(".pq-col-sort-count").html(i + 1)
					}
				}
			}
		}
	};
	_pq.cResizeColumns = function(that) {
		var self = this;
		self.that = that;
		that.$header.on({
			mousedown: function(evt) {
				if (!evt.pq_composed) {
					var $target = $(evt.target);
					self.setDraggables(evt);
					evt.pq_composed = true;
					var e = $.Event("mousedown", evt);
					$target.trigger(e)
				}
			},
			dblclick: function(evt) {
				self.doubleClick(evt)
			}
		}, ".pq-grid-col-resize-handle");
		var o = that.options,
			flex = o.flex;
		self.rtl = o.rtl ? "right" : "left";
		if (flex.on && flex.one) {
			that.one("ready", function() {
				self.flex()
			})
		}
	};
	_pq.cResizeColumns.prototype = {
		doubleClick: function(evt) {
			var that = this.that,
				o = that.options,
				flex = o.flex,
				$target = $(evt.target),
				colIndx = parseInt($target.attr("pq-col-indx"));
			if (isNaN(colIndx)) {
				return
			}
			if (flex.on) {
				this.flex(flex.all && !o.scrollModel.autoFit ? {} : {
					colIndx: [colIndx]
				})
			}
		},
		flex: function(ui) {
			this.that.iRenderB.flex(ui)
		},
		setDraggables: function(evt) {
			var $div = $(evt.target),
				self = this,
				rtl = self.rtl,
				drag_left, drag_new_left, cl_left;
			$div.draggable({
				axis: "x",
				helper: function(evt, ui) {
					var $target = $(evt.target),
						indx = parseInt($target.attr("pq-col-indx"));
					self._setDragLimits(indx);
					self._getDragHelper(evt, ui);
					return $target
				},
				start: function(evt, ui) {
					drag_left = evt.clientX;
					cl_left = parseInt(self.$cl[0].style[rtl])
				},
				drag: function(evt, ui) {
					drag_new_left = evt.clientX;
					var dx = drag_new_left - drag_left;
					self.rtl == "right" && (dx *= -1);
					self.$cl[0].style[rtl] = cl_left + dx + "px"
				},
				stop: function(evt, ui) {
					return self.resizeStop(evt, ui, drag_left)
				}
			})
		},
		_getDragHelper: function(evt) {
			var that = this.that,
				o = that.options,
				freezeCols = o.freezeCols * 1,
				$target = $(evt.target),
				$grid_center = that.$grid_center,
				iR = that.iRenderHead,
				ci = $target.attr("pq-col-indx") * 1,
				scrollX = ci < freezeCols ? 0 : iR.scrollX(),
				ht = $grid_center.outerHeight(),
				left = iR.getLeft(ci) - scrollX,
				left2 = iR.getLeft(ci + 1) - scrollX,
				style = "style='height:" + ht + "px;" + this.rtl + ":";
			this.$clleft = $("<div class='pq-grid-drag-bar' " + style + left + "px;'></div>").appendTo($grid_center);
			this.$cl = $("<div class='pq-grid-drag-bar' " + style + left2 + "px;'></div>").appendTo($grid_center)
		},
		_setDragLimits: function(ci) {
			if (ci < 0) {
				return
			}
			var that = this.that,
				iR = that.iRenderHead,
				CM = that.colModel,
				column = CM[ci],
				cont_left = iR.getLeft(ci) + column._minWidth,
				cont_right = cont_left + column._maxWidth - column._minWidth,
				$drag = $(iR._resizeDiv(ci));
			if ($drag.draggable("instance")) {
				$drag.draggable("option", "containment", [cont_left, 0, cont_right, 0])
			}
		},
		resizeStop: function(evt, ui, drag_left) {
			var self = this,
				that = self.that,
				CM = that.colModel,
				o = that.options,
				numberCell = o.numberCell;
			self.$clleft.remove();
			self.$cl.remove();
			var drag_new_left = evt.clientX,
				dx = drag_new_left - drag_left,
				$target = $(ui.helper),
				colIndx = $target.attr("pq-col-indx") * 1,
				column;
			o.rtl && (dx *= -1);
			if (colIndx == -1) {
				column = null;
				var oldWidth = parseInt(numberCell.width),
					newWidth = oldWidth + dx;
				numberCell.width = newWidth
			} else {
				column = CM[colIndx];
				var oldWidth = parseInt(column.width),
					newWidth = oldWidth + dx;
				column.width = newWidth;
				column._resized = true
			}
			that._trigger("columnResize", evt, {
				colIndx: colIndx,
				column: column,
				dataIndx: column ? column.dataIndx : null,
				oldWidth: oldWidth,
				newWidth: column ? column.width : numberCell.width
			});
			that.refresh({
				soft: true
			})
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.cDragColumns = function(that) {
		var self = this,
			o = that.options,
			dragColumns = o.dragColumns,
			arrow = function(updown, icon) {
				return $("<div class='pq-arrow-" + updown + " ui-icon " + icon + "'></div>").appendTo(that.element)
			};
		self.that = that;
		self.$drag_helper = null;
		self.rtl = o.rtl;
		self.status = "stop";
		self.$arrowTop = arrow("down", dragColumns.topIcon);
		self.$arrowBottom = arrow("up", dragColumns.bottomIcon);
		self.hideArrows();
		if (dragColumns && dragColumns.enabled) {
			that.$header.on("mousedown", ".pq-grid-col", self.onColMouseDown(self, that))
		}
	};
	_pq.cDragColumns.prototype = {
		dragHelper: function(self, that, column) {
			var rejectIcon = that.options.dragColumns.rejectIcon;
			return function() {
				self.status = "helper";
				that.$header.find(".pq-grid-col-resize-handle").hide();
				var $drag_helper = $("<div class='pq-col-drag-helper ui-widget-content ui-corner-all panel panel-default' >" + "<span class='pq-drag-icon ui-icon " + rejectIcon + " glyphicon glyphicon-remove'></span>" + column.pq_title + "</div>");
				self.$drag_helper = $drag_helper;
				return $drag_helper[0]
			}
		},
		getRowIndx: function(hc, colIndx, lastRowIndx) {
			var column, column2;
			while (lastRowIndx) {
				column = hc[lastRowIndx][colIndx];
				column2 = hc[lastRowIndx - 1][colIndx];
				if (column != column2) {
					break
				}
				lastRowIndx--
			}
			return lastRowIndx
		},
		hideArrows: function() {
			this.$arrowTop.hide();
			this.$arrowBottom.hide()
		},
		_columnIndexOf: function(colModel, column) {
			for (var i = 0, len = colModel.length; i < len; i++) {
				if (colModel[i] == column) {
					return i
				}
			}
			return -1
		},
		moveColumn: function(colIndxDrag, colIndxDrop, leftDrop, rowIndxDrag, rowIndxDrop) {
			var self = this,
				that = self.that,
				colModel = "colModel",
				optCM = that.options[colModel],
				hc = that.headerCells,
				lastRowIndx = that.depth - 1,
				rowIndxDrag = rowIndxDrag == null ? self.getRowIndx(hc, colIndxDrag, lastRowIndx) : rowIndxDrag,
				rowIndxDrop = rowIndxDrop == null ? self.getRowIndx(hc, colIndxDrop, lastRowIndx) : rowIndxDrop,
				columnDrag = hc[rowIndxDrag][colIndxDrag],
				columnDrop = hc[rowIndxDrop][colIndxDrop],
				columnDragParent = columnDrag.parent,
				columnDropParent = columnDrop.parent,
				colModelDrag = columnDragParent ? columnDragParent[colModel] : optCM,
				colModelDrop = columnDropParent ? columnDropParent[colModel] : optCM,
				indxDrag = colModelDrag.indexOf(columnDrag),
				incr = leftDrop ? 0 : 1,
				indxDrop = colModelDrop.indexOf(columnDrop),
				column = that.iCols.move(1, indxDrag, indxDrop + incr, columnDragParent, columnDropParent, "dnd")[0];
			return column
		},
		onColMouseDown: function(self, that) {
			return function(evt) {
				var colobj, col, parent, e, $td = $(this),
					$target = $(evt.target);
				if (!evt.pq_composed) {
					if ($target.is("input,select,textarea") || $target.parent().hasClass("pq-grid-header-search-row")) {
						return
					}
					colobj = that.getHeadCell($td);
					col = colobj.col;
					parent = col ? col.parent : null;
					if (!col || col.nodrag || col._nodrag || parent && parent.colSpan == 1) {
						return
					}
					if (self.setDraggable(evt, col, colobj)) {
						evt.pq_composed = true;
						e = $.Event("mousedown", evt);
						$target.trigger(e)
					}
				}
			}
		},
		onDrop: function() {
			var self = this,
				that = self.that;
			return function(evt, ui) {
				var colIndxDrag = ui.draggable.attr("pq-col-indx") * 1,
					rowIndxDrag = ui.draggable.attr("pq-row-indx") * 1,
					$this = $(this),
					colIndxDrop = $this.attr("pq-col-indx") * 1,
					rowIndxDrop = $this.attr("pq-row-indx") * 1,
					left = self.leftDrop,
					column;
				if (self.rtl) left = !left;
				if (that._trigger("beforeColumnOrder", null, {
						colIndxDrag: colIndxDrag,
						colIndxDrop: colIndxDrop,
						left: left
					}) !== false) {
					column = self.moveColumn(colIndxDrag, colIndxDrop, left, rowIndxDrag, rowIndxDrop);
					if (column) {
						that._trigger("columnOrder", null, {
							dataIndx: column.dataIndx,
							column: column,
							oldcolIndx: colIndxDrag,
							colIndx: that.getColIndx({
								column: column
							})
						})
					}
				}
			}
		},
		onStart: function(self, that, column, colobj) {
			return function(evt) {
				if (that._trigger("columnDrag", evt.originalEvent, {
						column: column
					}) === false) {
					return false
				}
				self.setDroppables(colobj)
			}
		},
		onDrag: function(self, that) {
			return function(evt, ui) {
				self.status = "drag";
				var $td = $(".pq-drop-hover", that.$header),
					wd, lft, $group, leftDrop;
				if ($td.length > 0) {
					self.updateDragHelper(true);
					wd = $td.width();
					lft = evt.clientX - $td.offset().left + $(document).scrollLeft();
					leftDrop = lft < wd / 2;
					self.leftDrop = leftDrop;
					self.showFeedback($td, leftDrop)
				} else {
					self.hideArrows();
					$group = $(".pq-drop-hover", that.$top);
					self.updateDragHelper(!!$group.length)
				}
			}
		},
		setDraggable: function(evt, column, colobj) {
			var $td = $(evt.currentTarget),
				self = this,
				that = self.that;
			if (!$td.hasClass("ui-draggable")) {
				$td.draggable({
					distance: 10,
					cursorAt: {
						top: -18,
						left: -10
					},
					zIndex: "1000",
					appendTo: that.element,
					revert: "invalid",
					helper: self.dragHelper(self, that, column),
					start: self.onStart(self, that, column, colobj),
					drag: self.onDrag(self, that),
					stop: function() {
						if (that.element) {
							self.status = "stop";
							that.$header.find(".pq-grid-col-resize-handle").show();
							self.hideArrows()
						}
					}
				});
				return true
			}
		},
		setDroppables: function(colObj) {
			var self = this,
				that = self.that,
				col_o = colObj.col,
				ri_o = colObj.ri,
				ci_o1 = colObj.o_ci,
				ci_o2 = ci_o1 + col_o.o_colspan,
				obj, ri, ci, col, $td, td_isDroppable, onDrop = self.onDrop(),
				clsHover = "pq-drop-hover ui-state-highlight",
				objDrop = {
					hoverClass: clsHover,
					classes: {
						"ui-droppable-hover": clsHover
					},
					accept: ".pq-grid-col",
					tolerance: "pointer",
					drop: onDrop
				},
				$tds = that.$header.find(":not(.pq-grid-header-search-row)>.pq-grid-col"),
				i = $tds.length;
			while (i--) {
				$td = $($tds[i]);
				td_isDroppable = $td.hasClass("ui-droppable");
				obj = that.getHeadCell($td);
				col = obj.col;
				ri = obj.ri;
				ci = obj.ci;
				if (col == col_o || col.nodrop || col._nodrop || ri_o < ri && ci >= ci_o1 && ci < ci_o2) {
					if (td_isDroppable) {
						$td.droppable("destroy")
					}
				} else if (!td_isDroppable) {
					$td.droppable(objDrop)
				}
			}
		},
		showFeedback: function($td, leftDrop) {
			var that = this.that,
				td = $td[0],
				grid_center_top = that.$grid_center[0].offsetTop,
				left = $td.offset().left - $(that.element).offset().left + (leftDrop ? 0 : td.offsetWidth) - 8,
				top = grid_center_top + td.offsetTop - 16,
				top2 = grid_center_top + that.$header[0].offsetHeight;
			this.$arrowTop.css({
				left: left,
				top: top,
				display: ""
			});
			this.$arrowBottom.css({
				left: left,
				top: top2,
				display: ""
			})
		},
		updateDragHelper: function(accept) {
			var that = this.that,
				dragColumns = that.options.dragColumns,
				removeClass = "removeClass",
				addClass = "addClass",
				acceptIcon = dragColumns.acceptIcon,
				rejectIcon = dragColumns.rejectIcon,
				$drag_helper = this.$drag_helper;
			if ($drag_helper) {
				$drag_helper[accept ? removeClass : addClass]("ui-state-error").children("span.pq-drag-icon")[accept ? addClass : removeClass](acceptIcon)[accept ? removeClass : addClass](rejectIcon)
			}
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.cHeaderSearch = function(that) {};
	_pq.cHeaderSearch.prototype = {
		_bindFocus: function() {
			var self = this,
				that = self.that;

			function handleFocus(e) {
				var $target = $(e.target),
					$inp = $target.closest(".pq-grid-hd-search-field"),
					dataIndx = $inp.attr("name");
				if (that.scrollColumn({
						dataIndx: dataIndx
					})) {
					var colIndx = that.getColIndx({
						dataIndx: dataIndx
					});
					var $ele = self.get$Ele(colIndx, dataIndx);
					$ele.focus()
				}
			}
			var $trs = that.$header.find(".pq-grid-header-search-row");
			for (var i = 0; i < $trs.length; i++) {
				$($trs[i]).on("focusin", handleFocus)
			}
		},
		_input: function(column, value, cls, style, attr, cond) {
			value = pq.formatEx(column, value, cond);
			return ["<input ", ' value="', value, "\" name='", column.dataIndx, "' type=text style='", style, "' class='", cls, "' ", attr, " />"].join("")
		},
		_onKeyDown: function(evt, ui, $this) {
			var self = this,
				that = this.that,
				$ele, keyCode = evt.keyCode,
				keyCodes = $.ui.keyCode;
			if (keyCode === keyCodes.TAB) {
				var colIndx = self.getCellIndx($this.closest(".pq-grid-col")[0])[1],
					CM = that.colModel,
					$inp, shiftKey = evt.shiftKey,
					column = CM[colIndx];
				if ((column.filterUI || {}).type == "textbox2") {
					that.scrollColumn({
						colIndx: colIndx
					});
					$ele = self.getCellEd(colIndx)[1];
					if ($ele[0] == $this[0]) {
						if (!shiftKey) $inp = $ele[1]
					} else {
						if (shiftKey) $inp = $ele[0]
					}
					if ($inp) {
						$inp.focus();
						evt.preventDefault();
						return false
					}
				}
				do {
					if (shiftKey) colIndx--;
					else colIndx++;
					if (colIndx < 0 || colIndx >= CM.length) {
						break
					}
					var column = CM[colIndx],
						cfilter = column.filter;
					if (column.hidden || !cfilter) {
						continue
					}
					that.scrollColumn({
						colIndx: colIndx
					}, function() {
						var $inp = self.getCellEd(colIndx)[1];
						if ((column.filterUI || {}).type == "textbox2") {
							$inp = $(shiftKey ? $inp[1] : $inp[0])
						}
						if ($inp) {
							$inp.focus();
							evt.preventDefault();
							return false
						}
					});
					break
				} while (1 === 1)
			} else {
				return true
			}
		},
		_textarea: function(dataIndx, value, cls, style, attr) {
			return ["<textarea name='", dataIndx, "' style='" + style + "' class='" + cls + "' " + attr + " >", value, "</textarea>"].join("")
		},
		bindListener: function($ele, event, handler, column) {
			var self = this,
				that = self.that,
				filter = column.filter,
				arr = pq.filter.getVal(filter),
				oval = arr[0],
				oval2 = arr[1];
			pq.fakeEvent($ele, event, that.options.filterModel.timeout);
			$ele.off(event).on(event, function(evt) {
				var value, value2, filterUI = column.filterUI,
					type = filterUI.type,
					condition = filterUI.condition;
				if (type == "checkbox") {
					value = $ele.pqval({
						incr: true
					})
				} else if (type == "textbox2") {
					value = $($ele[0]).val();
					value2 = $($ele[1]).val()
				} else {
					value = $ele.val()
				}
				value = value === "" ? undefined : pq.deFormat(column, value, condition);
				value2 = value2 === "" ? undefined : pq.deFormat(column, value2, condition);
				if (oval !== value || oval2 !== value2) {
					oval = value;
					oval2 = value2;
					handler = pq.getFn(handler);
					return handler.call(that, evt, {
						column: column,
						dataIndx: column.dataIndx,
						value: value,
						value2: value2
					})
				}
			})
		},
		betweenTmpl: function(input1, input2) {
			var strS = ["<div class='pq-from-div'>", input1, "</div>", "<span class='pq-from-to-center'>-</span>", "<div class='pq-to-div'>", input2, "</div>"].join("");
			return strS
		},
		createListener: function(type) {
			var obj = {},
				that = this.that;
			obj[type] = function(evt, ui) {
				var col = ui.column;
				that.filter({
					rules: [{
						dataIndx: col.filterIndx || ui.dataIndx,
						condition: col.filter.condition,
						value: ui.value,
						value2: ui.value2
					}]
				})
			};
			return obj
		},
		getCellEd: function(ci) {
			var self = this,
				ri = self.data.length - 1,
				$cell = $(this.getCell(ri, ci)),
				$editor = $cell.find(".pq-grid-hd-search-field");
			return [$cell, $editor]
		},
		onCreateHeader: function() {
			var self = this;
			if (self.that.options.filterModel.header) {
				self.eachH(function(column) {
					if (column.filter) {
						self.postRenderCell(column)
					}
				})
			}
		},
		onHeaderKeyDown: function(evt, ui) {
			var $src = $(evt.originalEvent.target);
			if ($src.hasClass("pq-grid-hd-search-field")) {
				return this._onKeyDown(evt, ui, $src)
			} else {
				return true
			}
		},
		postRenderCell: function(column) {
			var dataIndx = column.dataIndx,
				filterUI = column.filterUI || {},
				filter = column.filter,
				self = this,
				that = self.that,
				ci = that.colIndxs[dataIndx],
				arr = this.getCellEd(ci),
				$cell = arr[0],
				$editor = arr[1];
			if ($editor.length == 0) {
				return
			}
			var ftype = filterUI.type,
				events = {
					button: "click",
					select: "change",
					checkbox: "change",
					textbox: "timeout",
					textbox2: "timeout"
				},
				value = pq.filter.getVal(filter)[0];
			if (ftype == "checkbox") {
				$editor.pqval({
					val: value
				})
			} else if (ftype == "select") {
				value = value || [];
				if (!$.isArray(value)) {
					value = [value]
				}
				if (column.format) {
					value = value.slice(0, 25).map(function(val) {
						return pq.format(column, val)
					})
				}
				$editor.val(value.join(", "))
			}
			var finit = filterUI.init,
				flistener = filter.listener,
				listeners = filter.listeners || [flistener ? flistener : events[ftype]];
			if (finit) {
				finit.find(function(i) {
					return that.callFn(i, {
						dataIndx: dataIndx,
						column: column,
						filter: filter,
						filterUI: filterUI,
						$cell: $cell,
						$editor: $editor
					})
				})
			}
			for (var j = 0; j < listeners.length; j++) {
				var listener = listeners[j],
					typeL = typeof listener,
					obj = {};
				if (typeL == "string") {
					listener = self.createListener(listener)
				} else if (typeL == "function") {
					obj[events[ftype]] = listener;
					listener = obj
				}
				for (var event in listener) {
					self.bindListener($editor, event, listener[event], column)
				}
			}
		},
		getControlStr: function(column) {
			var that = this.that,
				dataIndx = column.dataIndx,
				filter = column.filter,
				corner_cls = " ui-corner-all",
				varr = pq.filter.getVal(filter),
				value = varr[0],
				value2 = varr[1],
				condition = varr[2],
				ui = {
					column: column,
					dataIndx: dataIndx,
					condition: condition,
					indx: 0
				},
				filterUI = column.filterUI = pq.filter.getFilterUI(ui, that),
				type = filterUI.type,
				strS = "";
			if (type == "textbox2") {
				value2 = value2 != null ? value2 : ""
			}
			var cls = "pq-grid-hd-search-field " + (filterUI.cls || ""),
				style = filterUI.style || "",
				attr = filterUI.attr || "";
			if (type && type.indexOf("textbox") >= 0) {
				value = value ? value : "";
				cls = cls + " pq-search-txt" + corner_cls;
				if (type == "textbox2") {
					strS = this.betweenTmpl(this._input(column, value, cls + " pq-from", style, attr, condition), this._input(column, value2, cls + " pq-to", style, attr, condition))
				} else {
					strS = this._input(column, value, cls, style, attr, condition)
				}
			} else if (type === "select") {
				cls = cls + corner_cls;
				var attrSelect = ["name='", dataIndx, "' class='", cls, "' style='", style, "' ", attr].join("");
				strS = "<input type='text' " + attrSelect + " >" + "<span style='position:absolute;" + (that.options.rtl ? "left" : "right") + ":0;top:3px;' class='ui-icon ui-icon-arrowthick-1-s'></span>"
			} else if (type == "checkbox") {
				var checked = value == null || value == false ? "" : "checked=checked";
				strS = ["<input ", checked, " name='", dataIndx, "' type=checkbox class='" + cls + "' style='" + style + "' " + attr + "/>"].join("")
			} else if (typeof type == "string") {
				strS = type
			}
			return strS
		},
		renderFilterCell: function(column, ci, td_cls) {
			var self = this,
				td, that = self.that,
				o = that.options,
				FM = o.filterModel,
				hasMenu, ccls = column.cls,
				strS, align = column.halign || column.align;
			align && td_cls.push("pq-align-" + align);
			ccls && td_cls.push(ccls);
			td_cls.push(column.clsHead);
			if (column.filter) {
				strS = self.getControlStr(column);
				if (strS) {
					td_cls.push("pq-col-" + ci)
				}
			}
			hasMenu = self.hasMenu(FM, column);
			if (hasMenu) td_cls.push("pq-has-menu");
			td = ["<div class='pq-td-div' style='overflow:hidden;'>", "", strS, "</div>", hasMenu ? "<span class='pq-filter-icon'></span>" : ""].join("");
			return td
		},
		hasMenu: function(FM, col) {
			var FM_menu = FM.menuIcon,
				filter_menu = (col.filter || {}).menuIcon;
			return FM_menu && filter_menu !== false || FM_menu !== false && filter_menu
		}
	}
})(jQuery);
(function($) {
	var cRefresh = $.paramquery.cRefresh = function(that) {
		var self = this;
		self.vrows = [];
		self.that = that;
		that.on("dataReadyDone", function() {
			self.addRowIndx(true)
		});
		$(window).on("resize" + that.eventNamespace + " " + "orientationchange" + that.eventNamespace, self.onWindowResize.bind(self))
	};
	$.extend(cRefresh, {
		Z: function() {
			return (window.outerWidth - 8) / window.innerWidth
		},
		cssZ: function() {
			return document.body.style.zoom
		},
		isFullScreen: function() {
			return document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen || window.innerHeight == screen.height
		},
		isSB: function() {
			return $(document).height() > $(window).height()
		}
	});
	$(document).one("pq:ready", function() {
		var z = cRefresh.Z,
			cssZ = cRefresh.cssZ,
			z1 = z(),
			cssZ1 = cssZ();
		cRefresh.isZoom = function() {
			var z2 = z(),
				cssZ2 = cssZ();
			if (z1 != z2 || cssZ1 != cssZ2) {
				z1 = z2;
				cssZ1 = cssZ2;
				return true
			}
		};
		var isSB = cRefresh.isSB,
			sb = isSB();
		pq.onResize(document.body, function() {
			var nsb = isSB();
			if (nsb != sb) {
				sb = nsb;
				$(window).trigger("resize", {
					SB: true
				})
			}
		})
	});
	$(window).on("resize", function() {
		if (cRefresh.isZoom) cRefresh.ISZOOM = cRefresh.isZoom()
	});
	cRefresh.prototype = {
		addRowIndx: function(UF) {
			var that = this.that,
				o = that.options,
				DM = o.dataModel,
				RT = o.rowTemplate,
				dataUF = DM.dataUF,
				data = that.get_p_data(),
				i = data.length,
				rd;
			while (i--) {
				rd = data[i];
				rd && (rd.pq_ri = i);
				RT && pq.extendT(rd, RT)
			}
			if (UF && dataUF) {
				i = dataUF.length;
				while (i--) {
					delete dataUF[i].pq_ri
				}
			}
		},
		move: function() {},
		setGridAndCenterHeightForFlex: function() {
			var that = this.that;
			that.element.height("");
			that.$grid_center.height("");
			that.dims.htGrid = that.element.height()
		},
		setGridWidthForFlex: function() {
			var that = this.that,
				o = that.options,
				maxWidthPixel = this.maxWidthPixel,
				$grid = that.element,
				toolWd = that.$toolPanel[0].offsetWidth,
				contWd = that.iRenderB.getFlexWidth(),
				gridWd = toolWd + contWd;
			if (o.maxWidth && gridWd >= this.maxWidthPixel) {
				gridWd = maxWidthPixel
			}
			that._trigger("contWd");
			$grid.width(gridWd + "px");
			that.dims.wdGrid = gridWd
		},
		_calcOffset: function(val) {
			var re = /(-|\+)([0-9]+)/;
			var match = re.exec(val);
			if (match && match.length === 3) {
				return parseInt(match[1] + match[2])
			} else {
				return 0
			}
		},
		setMax: function(prop) {
			var that = this.that,
				$grid = that.element,
				o = that.options,
				val = o[prop];
			if (val) {
				if (val == parseInt(val)) {
					val += "px"
				}
				$grid.css(prop, val)
			} else {
				$grid.css(prop, "")
			}
		},
		refreshGridWidthAndHeight: function() {
			var that = this.that,
				o = that.options,
				wd, ht, dims = that.dims,
				widthPercent = (o.width + "").indexOf("%") > -1 ? true : false,
				heightPercent = (o.height + "").indexOf("%") > -1 ? true : false,
				maxHeightPercent = (o.maxHeight + "").indexOf("%") > -1 ? true : false,
				flexHeight = o.height == "flex",
				dimsRelativeTo = o.dimsRelativeTo,
				maxHeightPercentAndFlexHeight = maxHeightPercent && flexHeight,
				maxWidthPercent = (o.maxWidth + "").indexOf("%") > -1 ? true : false,
				flexWidth = o.width == "flex",
				maxWidthPercentAndFlexWidth = maxWidthPercent && flexWidth,
				wdParent, htParent, parent, element = that.element;
			if (widthPercent || heightPercent || maxHeightPercentAndFlexHeight || maxWidthPercentAndFlexWidth) {
				parent = dimsRelativeTo ? $(dimsRelativeTo) : element.parent();
				if (!parent.length) {
					return
				}
				if (parent[0] == document.body || element.css("position") == "fixed") {
					wdParent = $(window).width();
					htParent = window.innerHeight || $(window).height()
				} else {
					wdParent = parent.width();
					htParent = parent.height()
				}
				var calcOffset = this._calcOffset,
					widthOffset = widthPercent ? calcOffset(o.width) : 0,
					heightOffset = heightPercent ? calcOffset(o.height) : 0;
				if (maxWidthPercentAndFlexWidth) {
					wd = parseInt(o.maxWidth) * wdParent / 100
				} else if (widthPercent) {
					wd = parseInt(o.width) * wdParent / 100 + widthOffset
				}
				if (maxHeightPercentAndFlexHeight) {
					ht = parseInt(o.maxHeight) * htParent / 100
				} else if (heightPercent) {
					ht = parseInt(o.height) * htParent / 100 + heightOffset
				}
			}
			if (!wd) {
				if (flexWidth && o.maxWidth) {
					if (!maxWidthPercent) {
						wd = o.maxWidth
					}
				} else if (!widthPercent) {
					wd = o.width
				}
			}
			if (o.maxWidth) {
				this.maxWidthPixel = wd
			}
			if (!ht) {
				if (flexHeight && o.maxHeight) {
					if (!maxHeightPercent) {
						ht = o.maxHeight
					}
				} else if (!heightPercent) {
					ht = o.height
				}
			}
			if (parseFloat(wd) == wd) {
				wd = wd < o.minWidth ? o.minWidth : wd;
				element.css("width", wd)
			} else if (wd === "auto") {
				element.width(wd)
			}
			if (parseFloat(ht) == ht) {
				ht = ht < o.minHeight ? o.minHeight : ht;
				element.css("height", ht)
			}
			dims.wdGrid = Math.round(element.width());
			dims.htGrid = Math.round(element.height())
		},
		isReactiveDims: function() {
			var that = this.that,
				o = that.options,
				wd = o.width,
				ht = o.height,
				maxWd = o.maxWidth,
				maxHt = o.maxHeight,
				isPercent = function(val) {
					return (val + "").indexOf("%") != -1 ? true : false
				},
				widthPercent = isPercent(wd),
				autoWidth = wd === "auto",
				heightPercent = isPercent(ht),
				maxWdPercent = isPercent(maxWd),
				maxHtPercent = isPercent(maxHt);
			return widthPercent || autoWidth || heightPercent || maxWdPercent || maxHtPercent
		},
		getParentDims: function() {
			var that = this.that,
				$grid = that.element,
				wd, ht, $parent = $grid.parent();
			if ($parent.length) {
				if ($parent[0] == document.body || $grid.css("position") == "fixed") {
					ht = window.innerHeight || $(window).height();
					wd = $(window).width()
				} else {
					ht = $parent.height();
					wd = $parent.width()
				}
				return [wd, ht]
			}
			return []
		},
		onWindowResize: function(evt, ui) {
			var self = this,
				that = self.that,
				dims = that.dims || {},
				htParent = dims.htParent,
				wdParent = dims.wdParent,
				o = that.options,
				$grid = that.element,
				newHtParent, newWdParent, arr, isReactiveDims, ui_grid;
			if (cRefresh.isFullScreen() || o.disabled) {
				return
			}
			if ($.support.touch && o.editModel.indices && $(document.activeElement).is(".pq-editor-focus")) {
				return
			}
			if (ui) {
				ui_grid = ui.$grid;
				if (ui_grid) {
					if (ui_grid == $grid || $grid.closest(ui_grid).length == 0) {
						return
					}
				}
			}
			isReactiveDims = self.isReactiveDims();
			if (cRefresh.ISZOOM) {
				return self.setResizeTimer(function() {
					self.refresh({
						soft: true
					})
				})
			}
			if (isReactiveDims) self.setResizeTimer(function() {
				arr = self.getParentDims(), newWdParent = arr[0], newHtParent = arr[1];
				if (newHtParent == htParent && newWdParent == wdParent) {
					if (parseInt($grid.width()) == parseInt(dims.wdGrid)) {
						return
					}
				} else {
					dims.htParent = newHtParent;
					dims.wdParent = newWdParent
				}
				self.refresh({
					soft: true
				})
			})
		},
		setResizeTimer: function(fn) {
			var self = this,
				that = self.that;
			clearTimeout(self._autoResizeTimeout);
			self._autoResizeTimeout = window.setTimeout(function() {
				if (that.element) fn ? fn() : self.refreshAfterResize()
			}, that.options.autoSizeInterval || 100)
		},
		refresh: function(ui) {
			ui = ui || {};
			var self = this,
				that = self.that,
				header = ui.header == null ? true : ui.header,
				pager = ui.pager,
				o, normal = !ui.soft,
				$grid = that.element,
				$tp = that.$toolPanel,
				dims = that.dims = that.dims || {
					htCenter: 0,
					htHead: 0,
					htSum: 0,
					htBody: 0,
					wdCenter: 0,
					htTblSum: 0
				};
			if (ui.colModel) {
				that.refreshCM()
			}
			if (!$grid[0].offsetWidth) {
				$grid.addClass("pq-pending-refresh");
				return
			}
			$tp.css("height", "1px");
			if (ui.toolbar) {
				that.refreshToolbar()
			}
			o = that.options;
			o.collapsible._collapsed = false;
			self.setMax("maxHeight");
			self.setMax("maxWidth");
			self.refreshGridWidthAndHeight();
			if (normal && pager !== false) {
				that._refreshPager()
			}
			dims.htCenter = self.setCenterHeight();
			dims.wdCenter = dims.wdGrid - $tp[0].offsetWidth;
			that.iRenderB.init({
				header: header,
				soft: ui.soft,
				source: ui.source
			});
			o.height == "flex" && self.setGridAndCenterHeightForFlex();
			o.width == "flex" && self.setGridWidthForFlex();
			var arr = this.getParentDims();
			dims.wdParent = arr[0];
			dims.htParent = arr[1];
			normal && that._createCollapse();
			o.dataModel.postDataOnce = undefined;
			that._trigger("refreshFull")
		},
		setCenterHeight: function() {
			var that = this.that,
				$top = that.$top,
				o = that.options,
				ht;
			if (o.height !== "flex" || o.maxHeight) {
				ht = that.dims.htGrid - (o.showTop ? $top[0].offsetHeight + parseInt($top.css("marginTop")) : 0) - that.$bottom[0].offsetHeight + 1;
				ht = ht >= 0 ? ht : "";
				that.$grid_center.height(ht)
			}
			return ht
		}
	}
})(jQuery);
(function($) {
	var cCheckBoxColumn = $.paramquery.cCheckBoxColumn = function(that, column) {
		var self = this,
			colCB, colUI;
		self.that = that;
		self.fns = {};
		self.options = that.options;
		colUI = self.colUI = column;
		if (column.cbId) colCB = self.colCB = that.columns[column.cbId];
		else colCB = self.colCB = column;
		var defObj = {
				all: false,
				header: false,
				select: false,
				check: true,
				uncheck: false
			},
			cb = colCB.cb = $.extend({}, defObj, colCB.cb),
			diCB = colCB.dataIndx;
		colUI._render = self.cellRender(colCB, colUI);
		self.on("dataAvailable", function() {
			that.one("dataReady", self.oneDataReady.bind(self))
		}).on("dataReady", self.onDataReady.bind(self)).on("valChange", self.onCheckBoxChange(self)).on("cellKeyDown", self.onCellKeyDown.bind(self)).on("refreshHeader", self.onRefreshHeader.bind(self)).on("change", self.onChange(self, that, diCB, cb.check, cb.uncheck));
		if (cb.select) {
			self.on("rowSelect", self.onRowSelect(self, that)).on("beforeRowSelectDone", self.onBeforeRowSelect(self, that, diCB, cb.check, cb.uncheck))
		}
		self.on("beforeCheck", self.onBeforeCheck.bind(self))
	};
	cCheckBoxColumn.prototype = $.extend({
		cellRender: function(colCB, colUI) {
			var self = this;
			return function(ui) {
				var grid = this,
					rd = ui.rowData,
					checked, disabled, diCB = colCB.dataIndx,
					cb = colCB.cb,
					renderLabel = colUI.renderLabel,
					useLabel = colUI.useLabel,
					text;
				if (rd.pq_gtitle || rd.pq_gsummary || ui.Export) {
					return
				}
				checked = cb.check === rd[diCB] ? "checked" : "";
				disabled = self.isEditable(rd, colCB, ui.rowIndx, ui.colIndx, diCB) ? "" : "disabled";
				if (renderLabel) {
					text = renderLabel.call(grid, ui)
				}
				if (text == null) {
					text = colCB == colUI ? "" : ui.formatVal || ui.cellData
				}
				return [useLabel ? " <label>" : "", "<input type='checkbox' ", checked, " ", disabled, " />", text, useLabel ? "</label>" : ""].join("")
			}
		},
		checkAll: function(check, evt) {
			check = check == null ? true : check;
			var that = this.that,
				cbAll = this.colCB.cb.all,
				data = cbAll ? that.options.dataModel.data : that.pdata;
			return this.checkNodes(data, check, evt)
		},
		checkNodes: function(nodes, check, evt) {
			if (!nodes.length) {
				return
			}
			if (check == null) check = true;
			var self = this,
				that = self.that,
				diUI = self.colUI.dataIndx,
				colCB = self.colCB,
				cb = colCB.cb,
				newVal = check ? cb.check : cb.uncheck,
				diCB = colCB.dataIndx,
				node0 = nodes[0],
				ri0 = node0.pq_ri,
				refreshCell = function() {
					that.refreshCell({
						rowIndx: ri0,
						dataIndx: diUI
					});
					return false
				},
				rowList = nodes.map(function(rd) {
					var oldRow = {},
						newRow = {};
					oldRow[diCB] = rd[diCB];
					newRow[diCB] = newVal;
					return {
						rowIndx: rd.pq_ri,
						rowData: rd,
						oldRow: oldRow,
						newRow: newRow
					}
				}),
				ui = {
					rowIndx: ri0,
					rowData: node0,
					dataIndx: diUI,
					check: check,
					rows: rowList
				},
				dui = {
					source: "checkbox"
				};
			if (that._trigger("beforeCheck", evt, ui) === false) {
				return refreshCell()
			}
			dui.updateList = ui.rows;
			dui.history = dui.track = cb.select ? false : null;
			if (that._digestData(dui) === false) {
				return refreshCell()
			}
			if (!cb.maxCheck && dui.updateList.length == 1) that.refreshRow({
				rowIndx: dui.updateList[0].rowIndx
			});
			else that.refresh({
				header: false
			})
		},
		isEditable: function(rd, col, ri, ci, di) {
			var that = this.that,
				ui = {
					rowIndx: ri,
					rowData: rd,
					column: col,
					colIndx: ci,
					dataIndx: di
				};
			return that.isEditable(ui)
		},
		onBeforeRowSelect: function(self, that, cb_di, cb_check, cb_uncheck) {
			return function(evt, ui) {
				if (ui.source != "checkbox") {
					var fn = function(rows) {
						var ri, rd, row, i = rows.length,
							col = that.columns[cb_di],
							ci = that.colIndxs[cb_di];
						while (i--) {
							row = rows[i];
							ri = row.rowIndx;
							rd = row.rowData;
							if (self.isEditable(rd, col, ri, ci, cb_di)) {
								rd[cb_di] = rd.pq_rowselect ? cb_uncheck : cb_check
							} else {
								rows.splice(i, 1)
							}
						}
					};
					fn(ui.addList);
					fn(ui.deleteList)
				}
			}
		},
		onCellKeyDown: function(evt, ui) {
			if (ui.dataIndx == this.colUI.dataIndx) {
				if (evt.keyCode == 13 || evt.keyCode == 32) {
					var $inp = $(evt.originalEvent.target).find("input");
					$inp.click();
					return false
				}
			}
		},
		onChange: function(self, that, diCB, check, uncheck) {
			return function(evt, ui) {
				var addList = [],
					deleteList = [],
					diUI = self.colUI.dataIndx,
					trigger = function(list, check) {
						if (list.length) that._trigger("check", evt, {
							rows: list,
							dataIndx: diUI,
							rowIndx: list[0].rowIndx,
							rowData: list[0].rowData,
							check: check
						})
					},
					fn = function(rlist) {
						rlist.forEach(function(list) {
							var newRow = list.newRow,
								oldRow = list.oldRow,
								val;
							if (newRow.hasOwnProperty(diCB)) {
								val = newRow[diCB];
								if (val === check) {
									addList.push(list)
								} else if (oldRow && oldRow[diCB] === check) {
									deleteList.push(list)
								}
							}
						})
					};
				self.setValCBox();
				fn(ui.addList);
				fn(ui.updateList);
				if (self.colCB.cb.select) {
					that.SelectRow().update({
						addList: addList,
						deleteList: deleteList,
						source: "checkbox"
					})
				}
				trigger(addList, true);
				trigger(deleteList, false)
			}
		},
		onCheckBoxChange: function(self) {
			return function(_evt, ui) {
				if (ui.dataIndx == self.colUI.dataIndx) {
					return self.checkNodes([ui.rowData], ui.input.checked, _evt)
				}
			}
		},
		onDataReady: function() {
			this.setValCBox()
		},
		off: function() {
			var obj = this.fns,
				that = this.that,
				key;
			for (key in obj) {
				that.off(key, obj[key])
			}
			this.fns = {}
		},
		on: function(evt, fn) {
			var self = this;
			self.fns[evt] = fn;
			self.that.on(evt, fn);
			return self
		},
		destroy: function() {
			this.off();
			for (var key in this) delete this[key]
		},
		oneDataReady: function() {
			var that = this.that,
				rowData, data = that.get_p_data(),
				i = 0,
				len = data.length,
				column = this.colCB,
				cb = column.cb,
				dataIndx = column.dataIndx;
			if (dataIndx != null && data) {
				if (cb.select) {
					for (; i < len; i++) {
						if (rowData = data[i]) {
							if (rowData[dataIndx] === cb.check) {
								rowData.pq_rowselect = true
							} else if (rowData.pq_rowselect) {
								rowData[dataIndx] = cb.check
							}
						}
					}
				}
			}
		},
		onRowSelect: function(self, that) {
			return function(evt, ui) {
				if (ui.source != "checkbox") {
					if (ui.addList.length || ui.deleteList.length) {
						self.setValCBox();
						that.refresh({
							header: false
						})
					}
				}
			}
		}
	}, pq.mixin.ChkGrpTree)
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		fni = {};
	fni.options = {
		stateColKeys: {
			width: 1,
			filter: ["crules", "mode"],
			hidden: 1
		},
		stateKeys: {
			height: 1,
			width: 1,
			freezeRows: 1,
			freezeCols: 1,
			groupModel: ["dataIndx", "collapsed", "grandSummary"],
			pageModel: ["curPage", "rPP"],
			sortModel: ["sorter"]
		},
		detailModel: {
			cache: true,
			offset: 100,
			expandIcon: "ui-icon-triangle-1-se glyphicon glyphicon-minus",
			collapseIcon: "ui-icon-triangle-1-e glyphicon glyphicon-plus",
			height: "auto"
		},
		dragColumns: {
			enabled: true,
			acceptIcon: "ui-icon-check glyphicon-ok",
			rejectIcon: "ui-icon-closethick glyphicon-remove",
			topIcon: "ui-icon-circle-arrow-s glyphicon glyphicon-circle-arrow-down",
			bottomIcon: "ui-icon-circle-arrow-n glyphicon glyphicon-circle-arrow-up"
		},
		flex: {
			on: true,
			one: false,
			all: true
		},
		track: null,
		mergeModel: {
			flex: false
		},
		realFocus: true,
		sortModel: {
			on: true,
			type: "local",
			multiKey: "shiftKey",
			number: true,
			single: true,
			cancel: true,
			sorter: [],
			useCache: true,
			ignoreCase: false
		},
		filterModel: {
			on: true,
			newDI: [],
			type: "local",
			mode: "AND",
			header: false,
			timeout: 400
		}
	};
	fni._create = function() {
		var that = this,
			o = that.options;
		if (o.rtl == null) o.rtl = that.element.css("direction") == "rtl";
		that.listeners = {};
		that._queueATriggers = {};
		that.iHistory = new _pq.cHistory(that);
		that.iGroup = new _pq.cGroup(that);
		that.iMerge = new _pq.cMerge(that);
		that.iFilterData = new _pq.cFilterData(that);
		that.iSelection = new pq.Selection(that);
		that.iHeaderSearch = new _pq.cHeaderSearch(that);
		that.iUCData = new _pq.cUCData(that);
		that.iMouseSelection = new _pq.cMouseSelection(that);
		that._super();
		new _pq.cFormula(that);
		that.iDragColumns = new _pq.cDragColumns(that);
		that.refreshToolbar();
		if (o.dataModel.location === "remote") {
			that.refresh()
		}
		that.on("dataAvailable", function() {
			that.one("refreshDone", function() {
				that._trigger("ready");
				setTimeout(function() {
					if (that.element) {
						that._trigger("complete")
					}
				}, 0)
			})
		});
		that.refreshDataAndView({
			header: true
		})
	};
	$.widget("paramquery.pqGrid", _pq._pqGrid, fni);
	$.widget.extend = function() {
		var arr_shift = Array.prototype.shift,
			isPlainObject = $.isPlainObject,
			isArray = $.isArray,
			w_extend = $.widget.extend,
			target = arr_shift.apply(arguments),
			deep, _deep;
		if (typeof target == "boolean") {
			deep = target;
			target = arr_shift.apply(arguments)
		}
		var inputs = arguments,
			i = 0,
			len = inputs.length,
			input, fn, descriptor, key, val;
		if (deep == null) {
			deep = len > 1 ? true : false
		}
		for (; i < len; i++) {
			input = inputs[i];
			for (key in input) {
				descriptor = Object.getOwnPropertyDescriptor(input, key);
				if ((fn = descriptor.get) && fn.name != "reactiveGetter" || descriptor.set) {
					Object.defineProperty(target, key, descriptor);
					continue
				}
				val = input[key];
				if (val !== undefined) {
					_deep = i > 0 ? false : true;
					if (isPlainObject(val)) {
						if (val.byRef) {
							target[key] = val
						} else {
							target[key] = target[key] || {};
							w_extend(_deep, target[key], val)
						}
					} else if (isArray(val)) {
						target[key] = deep && _deep ? val.slice() : val
					} else {
						target[key] = val
					}
				}
			}
		}
		return target
	};
	pq.grid = function(selector, options) {
		var $g = $(selector).pqGrid(options),
			g = $g.data("paramqueryPqGrid") || $g.data("paramquery-pqGrid");
		return g
	};
	_pq.pqGrid.regional = {};
	var fn = _pq.pqGrid.prototype;
	_pq.pqGrid.defaults = fn.options;
	fn.focusT = function(ui) {
		var self = this;
		setTimeout(function() {
			self.focus(ui)
		})
	};
	fn.focus = function(_ui) {
		var ui = _ui || {},
			that = this,
			o = that.options,
			$td = ui.$td,
			td, ae = document.activeElement,
			fe, nofocus, $cont = that.$cont,
			cont = $cont[0],
			data, rip = ui.rowIndxPage,
			ri, iM, cord, ci = ui.colIndx,
			realFocus;
		if (o.nofocus) {
			return
		}
		if (rip == null || ci == null) {
			if (ae && ae != document.body && ae.id != "pq-grid-excel" && ae.className != "pq-body-outer") {
				nofocus = true;
				return
			}
			fe = this._focusEle;
			if (fe) {
				rip = fe.rowIndxPage;
				ci = fe.colIndx
			} else {
				nofocus = true
			}
		}
		if (rip != null) {
			iM = that.iMerge;
			ri = rip + that.riOffset;
			if (iM.ismergedCell(ri, ci)) {
				cord = iM.getRootCellO(ri, ci);
				rip = cord.rowIndxPage;
				ci = cord.colIndx
			}
			ci = ci == -1 ? that.getFirstVisibleCI(true) : ci;
			$td = that.getCell({
				rowIndxPage: rip,
				colIndx: ci
			})
		}
		if (rip == null || ci == null) {
			return
		}
		realFocus = $td[0];
		if (realFocus) {
			if (ae != document.body) $(ae).blur();
			$cont.find(".pq-focus").removeAttr("tabindex").removeClass("pq-focus");
			$cont.removeAttr("tabindex");
			fe = this._focusEle = this._focusEle || {};
			if ($td && (td = $td[0]) && $td.hasClass("pq-grid-cell") && !td.edited) {
				if (fe.$ele && fe.$ele.length) {
					fe.$ele[0].removeAttribute("tabindex")
				}
				fe.$ele = $td;
				fe.rowIndxPage = rip;
				fe.colIndx = ci;
				td.setAttribute("tabindex", "-1");
				if (!nofocus) {
					$td.addClass("pq-focus");
					td.focus()
				}
			} else {
				data = o.dataModel.data;
				if (!data || !data.length) {
					cont.setAttribute("tabindex", 0)
				}
			}
		}
	};
	fn.onfocus = function() {
		var fe = this._focusEle;
		if (fe) {
			this.getCell(fe).addClass("pq-focus")
		}
	};
	fn.onblur = function() {
		var fe = this._focusEle;
		if (fe) {
			var rip = fe.rowIndxPage,
				ci = fe.colIndx,
				ae = document.activeElement;
			this.$cont.find(".pq-focus").removeClass("pq-focus");
			if (ae && ae != document.body && ae.id != "pq-grid-excel" && ae.className != "pq-body-outer") {
				this._focusEle = {}
			}
		}
	};
	fn.callFn = function(cb, ui) {
		return pq.getFn(cb).call(this, ui)
	};
	fn.rowExpand = function(objP) {
		this.iHierarchy.rowExpand(objP)
	};
	fn.rowInvalidate = function(objP) {
		this.iHierarchy.rowInvalidate(objP)
	};
	fn.rowCollapse = function(objP) {
		this.iHierarchy.rowCollapse(objP)
	};
	fn._saveState = function(source, dest, stateKeys) {
		var key, model, oModel, obj;
		for (key in stateKeys) {
			model = stateKeys[key];
			if (model) {
				oModel = source[key];
				if ($.isArray(model)) {
					if (oModel != null) {
						obj = dest[key] = $.isPlainObject(dest[key]) ? dest[key] : {};
						model.forEach(function(prop) {
							obj[prop] = oModel[prop]
						})
					}
				} else dest[key] = oModel
			}
		}
	};
	fn.saveState = function(ui) {
		ui = ui || {};
		var self = this,
			$grid = self.element,
			extra, o = self.options,
			di, stateColKeys = o.stateColKeys,
			stateKeys = o.stateKeys,
			CM = self.colModel,
			sCM = [],
			column, sCol, i = 0,
			CMlen = CM.length,
			state, id = $grid[0].id;
		for (; i < CMlen; i++) {
			column = CM[i];
			di = column.dataIndx;
			sCol = {
				dataIndx: di
			};
			self._saveState(column, sCol, stateColKeys);
			sCM[i] = sCol
		}
		state = {
			colModel: sCM,
			datestamp: Date.now()
		};
		self._saveState(o, state, stateKeys);
		if (extra = ui.extra) state = $.extend(true, state, extra);
		if (ui.stringify !== false) {
			state = JSON.stringify(state);
			if (ui.save !== false && typeof Storage !== "undefined") {
				localStorage.setItem("pq-grid" + (id || ""), state)
			}
		}
		return state
	};
	fn.getState = function() {
		if (typeof Storage !== "undefined") return localStorage.getItem("pq-grid" + (this.element[0].id || ""))
	};
	fn.loadState = function(ui) {
		ui = ui || {};
		var self = this,
			obj, wextend = $.widget.extend,
			state = ui.state || self.getState();
		if (!state) {
			return false
		} else if (typeof state == "string") {
			state = JSON.parse(state)
		}
		var CMstate = state.colModel,
			columnSt, columns = [],
			column, dataIndx, colOrder = [],
			o = self.options,
			stateColKeys = o.stateColKeys,
			isColGroup = self.depth > 1,
			oCM = isColGroup ? self.colModel : o.colModel;
		for (var i = 0, len = CMstate.length; i < len; i++) {
			columnSt = CMstate[i];
			dataIndx = columnSt.dataIndx;
			columns[dataIndx] = columnSt;
			colOrder[dataIndx] = i
		}
		if (!isColGroup) {
			oCM.sort(function(col1, col2) {
				return colOrder[col1.dataIndx] - colOrder[col2.dataIndx]
			})
		}
		for (i = 0, len = oCM.length; i < len; i++) {
			column = oCM[i];
			dataIndx = column.dataIndx;
			if (columnSt = columns[dataIndx]) {
				self._saveState(columnSt, column, stateColKeys)
			}
		}
		self.iCols.init();
		wextend(o.sortModel, state.sortModel);
		wextend(o.pageModel, state.pageModel);
		self.Group().option(state.groupModel, false);
		self.Tree().option(state.treeModel, false);
		obj = {
			freezeRows: state.freezeRows,
			freezeCols: state.freezeCols
		};
		if (!isNaN(o.height * 1) && !isNaN(state.height * 1)) {
			obj.height = state.height
		}
		if (!isNaN(o.width * 1) && !isNaN(state.width * 1)) {
			obj.width = state.width
		}
		self.option(obj);
		if (ui.refresh !== false) {
			self.refreshDataAndView()
		}
		return true
	};
	fn.refreshToolbar = function() {
		var that = this,
			options = that.options,
			tb = options.toolbar,
			_toolbar;
		if (that._toolbar) {
			_toolbar = that._toolbar;
			_toolbar.destroy()
		}
		if (tb) {
			var cls = tb.cls || "",
				style = tb.style || "",
				attr = tb.attr || "",
				items = tb.items,
				$toolbar = $("<div class='" + cls + "' style='" + style + "' " + attr + " ></div>");
			if (_toolbar) {
				_toolbar.widget().replaceWith($toolbar)
			} else {
				that.$top.append($toolbar)
			}
			_toolbar = pq.toolbar($toolbar, {
				items: items,
				gridInstance: that,
				bootstrap: options.bootstrap
			});
			if (!options.showToolbar) {
				$toolbar.css("display", "none")
			}
			that._toolbar = _toolbar
		}
	};
	fn.filter = function(objP) {
		return this.iFilterData.filter(objP)
	};
	fn.Checkbox = function(di) {
		return this.iCheckBox[di]
	};
	fn.refreshHeader = function() {
		this.iRenderHead.refreshHS()
	};
	fn.refreshHeaderFilter = function(ui) {
		var obj = this.normalize(ui),
			ci = obj.colIndx,
			column = obj.column,
			iH = this.iRenderHead,
			rowData = {},
			rip = iH.rows - 1;
		if (this.options.filterModel.header) {
			iH.refreshCell(rip, ci, rowData, column);
			iH.postRenderCell(column, ci, rip)
		}
	};
	fn._refreshHeaderSortIcons = function() {
		this.iHeader.refreshHeaderSortIcons()
	};
	fn.pageData = function() {
		return this.pdata
	};

	function _getData(data, dataIndices, arr) {
		for (var i = 0, len = data.length; i < len; i++) {
			var rowData = data[i],
				row = {},
				dataIndx, j = 0,
				dILen = dataIndices.length;
			for (; j < dILen; j++) {
				dataIndx = dataIndices[j];
				row[dataIndx] = rowData[dataIndx]
			}
			arr.push(row)
		}
	}
	fn.getData = function(ui) {
		ui = ui || {};
		var dataIndices = ui.dataIndx,
			dILen = dataIndices ? dataIndices.length : 0,
			data = ui.data,
			useCustomSort = !dILen,
			columns = this.columns,
			DM = this.options.dataModel,
			DMData = DM.dataPrimary || DM.data || [],
			DMDataUF = DM.dataUF || [],
			arr = [];
		if (dILen) {
			if (data) {
				_getData(data, dataIndices, arr)
			} else {
				_getData(DMData, dataIndices, arr);
				_getData(DMDataUF, dataIndices, arr)
			}
		} else {
			return DMDataUF.length ? DMData.concat(DMDataUF) : DMData
		}
		var arr2 = [],
			sorters = dataIndices.reduce(function(arr, di) {
				var column = columns[di];
				if (column) arr.push({
					dataIndx: di,
					dir: "up",
					dataType: column.dataType,
					sortType: column.sortType
				});
				return arr
			}, []),
			obj = {};
		for (var i = 0, len = arr.length; i < len; i++) {
			var rowData = arr[i],
				item = JSON.stringify(rowData);
			if (!obj[item]) {
				arr2.push(rowData);
				obj[item] = 1
			}
		}
		arr2 = this.iSort._sortLocalData(sorters, arr2, useCustomSort);
		return arr2
	};
	fn.getPlainOptions = function(options, di) {
		var item = options[0];
		if ($.isPlainObject(item)) {
			var keys = Object.keys(item);
			if (keys[0] != di && keys.length == 1) {
				options = options.map(function(item) {
					var obj = {},
						key;
					for (key in item) {
						obj[di] = key;
						obj.pq_label = item[key]
					}
					return obj
				})
			}
		} else {
			options = options.map(function(val) {
				var opt = {};
				opt[di] = val;
				return opt
			})
		}
		return options
	};
	fn.getDataCascade = function(di, diG, diExtra) {
		var grid = this,
			FM = grid.options.filterModel,
			order = FM.newDI.slice(),
			rules, dataIndx = diG ? [diG, di] : [di],
			index = order.indexOf(di),
			data, mode = FM.mode;
		if (mode == "AND" && order.length && FM.type != "remote") {
			if (index >= 0) {
				order.splice(index, order.length)
			}
			if (order.length) {
				rules = order.map(function(_di) {
					var filter = grid.getColumn({
							dataIndx: _di
						}).filter,
						rules = filter.crules || [filter];
					return {
						dataIndx: _di,
						crules: rules,
						mode: filter.mode
					}
				});
				data = grid.filter({
					data: grid.getData(),
					mode: "AND",
					rules: rules
				})
			}
		}
		dataIndx = dataIndx.concat(diExtra || []);
		return grid.getData({
			data: data,
			dataIndx: dataIndx
		})
	};
	fn.removeNullOptions = function(data, di, diG) {
		var firstEmpty;
		if (diG == null) {
			return data.filter(function(rd) {
				var val = rd[di];
				if (val == null || val === "") {
					if (!firstEmpty) {
						firstEmpty = true;
						rd[di] = "";
						return true
					}
				} else {
					return true
				}
			})
		} else {
			return data.filter(function(rd) {
				var val = rd[di];
				if (val == null || val === "") {
					return false
				}
				return true
			})
		}
	};
	fn.get_p_data = function() {
		var o = this.options,
			PM = o.pageModel,
			paging = PM.type,
			remotePaging, data = o.dataModel.data,
			pdata = this.pdata,
			rpp, offset, arr = [],
			arr2;
		if (paging) {
			rpp = PM.rPP;
			offset = this.riOffset;
			if (!pdata.length && data.length) {
				pdata = data.slice(offset, offset + rpp)
			}
			remotePaging = paging == "remote";
			arr = remotePaging ? new Array(offset) : data.slice(0, offset);
			arr2 = remotePaging ? [] : data.slice(offset + rpp);
			return arr.concat(pdata, arr2)
		} else {
			return pdata.length ? pdata : data
		}
	};
	fn._onDataAvailable = function(objP) {
		objP = objP || {};
		var self = this,
			options = self.options,
			apply = !objP.data,
			source = objP.source,
			sort = objP.sort,
			data = [],
			FM = options.filterModel,
			DM = options.dataModel,
			SM = options.sortModel;
		if (apply !== false) {
			self.pdata = [];
			if (objP.trigger !== false) {
				self._trigger("dataAvailable", objP.evt, {
					source: source
				})
			}
		}
		if (FM && FM.on && FM.type == "local") {
			data = self.iFilterData.filterLocalData(objP).data
		} else {
			data = DM.data
		}
		if (SM.type == "local") {
			if (sort !== false) {
				if (apply) {
					self.sort({
						refresh: false
					})
				} else {
					data = self.iSort.sortLocalData(data, true)
				}
			}
		}
		if (apply === false) {
			return data
		}
		self.refreshView(objP)
	};
	fn.reset = function(ui) {
		ui = ui || {};
		var self = this,
			sort = ui.sort,
			o = self.options,
			refresh = ui.refresh !== false,
			extend = $.extend,
			sortModel, groupModel, filter = ui.filter,
			group = ui.group;
		if (!sort && !filter && !group) {
			return
		}
		if (sort) {
			sortModel = sort === true ? {
				sorter: []
			} : sort;
			extend(o.sortModel, sortModel)
		}
		if (filter) {
			!refresh && this.iFilterData.clearFilters(self.colModel)
		}
		if (group) {
			groupModel = group === true ? {
				dataIndx: []
			} : group;
			self.groupOption(groupModel, false)
		}
		if (refresh) {
			if (filter) {
				self.filter({
					oper: "replace",
					rules: []
				});
				self.refreshHeader()
			} else if (sort) {
				self.sort()
			} else {
				self.refreshView()
			}
		}
	};
	fn._trigger = _pq._trigger;
	fn.on = _pq.on;
	fn.one = _pq.one;
	fn.off = _pq.off;
	fn.pager = function() {
		var p;
		this.pageI = this.pageI || ((p = this.widget().find(".pq-pager")).length ? p.pqPager("instance") : null);
		return this.pageI
	};
	fn.toolbar = function() {
		return this._toolbar.element
	};
	fn.Columns = function() {
		return this.iCols
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.cColModel = function(that) {
		this.that = that;
		this.vciArr;
		this.ciArr;
		this.init()
	};
	_pq.cColModel.prototype = {
		add: function(columns, ci, CM, source) {
			var self = this,
				that = self.that,
				CM = CM || that.options.colModel,
				ci = ci == null ? CM.length : ci,
				ui = {
					args: arguments
				},
				parent, CM2, n = columns.length,
				params = [ci, 0].concat(columns);
			if (that._trigger("beforeColAdd", null, ui) !== false) {
				source == "undo" || source == "redo" || that.iHistory.push({
					callback: function(redo) {
						CM2 = (parent || {}).colModel;
						if (redo) self.add(columns, ci, CM2, "redo");
						else self.remove(n, ci, CM2, "undo")
					}
				});
				CM.splice.apply(CM, params);
				that.refreshCM();
				parent = CM[0].parent;
				that._trigger("colAdd", null, ui);
				that.refresh()
			}
		},
		move: function(howmany, fromindx, toindx, fromParent, toParent, source) {
			var self = this,
				to, ui = {
					args: arguments
				},
				that = self.that,
				o = that.options,
				columns = [],
				CM = o.colModel,
				fromCM = (fromParent || {}).colModel || CM,
				toCM = (toParent || {}).colModel || CM;
			if (that._trigger("beforeColMove", null, ui) !== false) {
				source == "undo" || source == "redo" || that.iHistory.push({
					callback: function(redo) {
						if (redo) self.move(howmany, fromindx, toindx, fromParent, toParent, "redo");
						else {
							self.move(howmany, to, fromCM == toCM && fromindx > to ? fromindx + howmany : fromindx, toParent, fromParent, "undo")
						}
					}
				});
				columns = fromCM.splice(fromindx, howmany);
				if (fromCM == toCM && toindx > fromindx + howmany) to = toindx - howmany;
				else to = toindx;
				toCM.splice.apply(toCM, [to, 0].concat(columns));
				that.refreshCM();
				that._trigger("colMove", null, ui);
				that.refresh()
			}
			return columns
		},
		remove: function(n, ci, CM, source) {
			var self = this,
				ui = {
					args: arguments
				},
				that = self.that,
				columns, iCheckBox = that.iCheckBox,
				CM = CM || that.options.colModel,
				CM2, parent = CM[0].parent;
			if (that._trigger("beforeColRemove", null, ui) !== false) {
				source == "undo" || source == "redo" || that.iHistory.push({
					callback: function(redo) {
						CM2 = (parent || {}).colModel;
						if (redo) self.remove(n, ci, CM2, "redo");
						else self.add(columns, ci, CM2, "undo")
					}
				});
				columns = CM.splice(ci, n);
				that.refreshCM();
				that._trigger("colRemove", null, ui);
				that.refresh()
			}
		},
		alter: function(cb) {
			var that = this.that;
			cb.call(that);
			that.refreshCM();
			that.refresh()
		},
		assignRowSpan: function() {
			var that = this.that,
				CMLength = that.colModel.length,
				headerCells = that.headerCells,
				column, column2, row, row2, rowSpan, depth = that.depth,
				col = 0;
			for (; col < CMLength; col++) {
				for (row = 0; row < depth; row++) {
					column = headerCells[row][col];
					if (col > 0 && column == headerCells[row][col - 1]) {
						continue
					} else if (row > 0 && column == headerCells[row - 1][col]) {
						continue
					}
					rowSpan = 1;
					for (row2 = row + 1; row2 < depth; row2++) {
						column2 = headerCells[row2][col];
						if (column == column2) {
							rowSpan++
						}
					}
					column.rowSpan = rowSpan
				}
			}
			return headerCells
		},
		autoGenColumns: function() {
			var that = this.that,
				o = that.options,
				CT = o.columnTemplate || {},
				CT_dataType = CT.dataType,
				CT_title = CT.title,
				CT_width = CT.width,
				data = o.dataModel.data,
				val = pq.valid,
				CM = [];
			if (data && data.length) {
				var rowData = data[0];
				$.each(rowData, function(indx, cellData) {
					var dataType = "string";
					if (val.isInt(cellData)) {
						if (cellData + "".indexOf(".") > -1) {
							dataType = "float"
						} else {
							dataType = "integer"
						}
					} else if (val.isDate(cellData)) {
						dataType = "date"
					} else if (val.isFloat(cellData)) {
						dataType = "float"
					}
					CM.push({
						dataType: CT_dataType ? CT_dataType : dataType,
						dataIndx: indx,
						title: CT_title ? CT_title : indx,
						width: CT_width ? CT_width : 100
					})
				})
			}
			o.colModel = CM
		},
		cacheIndices: function() {
			var self = this,
				that = self.that,
				isJSON = self.getDataType() == "JSON" ? true : false,
				columns = {},
				colIndxs = {},
				validations = {},
				CM = that.colModel,
				i = 0,
				valids, dataType, CMLength = CM.length,
				vci = 0,
				vciArr = self.vciArr = [],
				ciArr = self.ciArr = [];
			for (; i < CMLength; i++) {
				var column = CM[i],
					dataIndx = column.dataIndx;
				if (dataIndx == null) {
					dataIndx = column.type == "detail" ? "pq_detail" : isJSON ? "dataIndx_" + i : i;
					if (dataIndx == "pq_detail") {
						column.dataType = "object"
					}
					column.dataIndx = dataIndx
				}
				columns[dataIndx] = column;
				colIndxs[dataIndx] = i;
				valids = column.validations;
				if (valids) {
					validations[dataIndx] = validations
				}
				if (!column.hidden) {
					ciArr[vci] = i;
					vciArr[i] = vci;
					vci++
				}
				if (!column.align) {
					dataType = column.dataType;
					if (dataType && (dataType == "integer" || dataType == "float")) column.align = "right"
				}
			}
			that.columns = columns;
			that.colIndxs = colIndxs;
			that.validations = validations
		},
		collapse: function(column) {
			var collapsible = column.collapsible,
				close = collapsible.on || false,
				CM = column.colModel || [],
				len = CM.length,
				i = len,
				col, x, hidden, hiddenCols = 0,
				last = collapsible.last,
				indx = last ? len - 1 : 0;
			if (len) {
				while (i--) {
					col = CM[i];
					if (last === null) {
						hidden = col.showifOpen === close;
						if (hidden) hiddenCols++
					} else hidden = indx === i ? false : close;
					col.hidden = hidden;
					if (!hidden && (x = col.colModel) && !col.collapsible) this.each(function(_col) {
						_col.hidden = hidden
					}, x)
				}
				if (hiddenCols == len) {
					this.each(function(_col) {
						_col.hidden = false
					}, [CM[0]])
				}
			}
		},
		each: function(cb, cm) {
			var that = this.that;
			(cm || that.options.colModel).forEach(function(col) {
				cb.call(that, col);
				col.colModel && this.each(cb, col.colModel)
			}, this)
		},
		extend: function(CM, CMT) {
			var i = CM.length;
			while (i--) {
				var column = CM[i];
				CMT && pq.extendT(column, CMT)
			}
		},
		find: function(cb, _cm) {
			var that = this.that,
				CM = _cm || that.options.colModel,
				i = 0,
				len = CM.length,
				col, ret;
			for (; i < len; i++) {
				col = CM[i];
				if (cb.call(that, col)) {
					return col
				}
				if (col.colModel) {
					ret = this.find(cb, col.colModel);
					if (ret) return ret
				}
			}
		},
		getHeaderCells: function() {
			var that = this.that,
				optColModel = that.options.colModel,
				CMLength = that.colModel.length,
				depth = that.depth,
				arr = [];
			for (var row = 0; row < depth; row++) {
				arr[row] = [];
				var k = 0,
					childCountSum = 0;
				for (var col = 0; col < CMLength; col++) {
					var colModel;
					if (row == 0) {
						colModel = optColModel[k]
					} else {
						var parentColModel = arr[row - 1][col],
							children = parentColModel.colModel;
						if (!children || children.length == 0) {
							colModel = parentColModel
						} else {
							var diff = col - parentColModel.leftPos,
								childCountSum2 = 0,
								tt = 0;
							for (var t = 0; t < children.length; t++) {
								childCountSum2 += children[t].childCount > 0 ? children[t].childCount : 1;
								if (diff < childCountSum2) {
									tt = t;
									break
								}
							}
							colModel = children[tt]
						}
					}
					var childCount = colModel.childCount ? colModel.childCount : 1;
					if (col == childCountSum) {
						colModel.leftPos = col;
						arr[row][col] = colModel;
						childCountSum += childCount;
						if (optColModel[k + 1]) {
							k++
						}
					} else {
						arr[row][col] = arr[row][col - 1]
					}
				}
			}
			that.headerCells = arr;
			return arr
		},
		getDataType: function() {
			var CM = this.colModel;
			if (CM && CM[0]) {
				var dataIndx = CM[0].dataIndx;
				if (typeof dataIndx == "string") {
					return "JSON"
				} else {
					return "ARRAY"
				}
			}
		},
		getci: function(vci) {
			return this.ciArr[vci]
		},
		getvci: function(ci) {
			return this.vciArr[ci]
		},
		getNextVisibleCI: function(ci) {
			var vciArr = this.vciArr,
				len = this.that.colModel.length;
			for (; ci < len; ci++) {
				if (vciArr[ci] != null) {
					return ci
				}
			}
		},
		getPrevVisibleCI: function(ci) {
			var vciArr = this.vciArr,
				len = this.that.colModel.length;
			for (; ci >= 0; ci--) {
				if (vciArr[ci] != null) {
					return ci
				}
			}
		},
		getLastVisibleCI: function() {
			var arr = this.ciArr;
			return arr[arr.length - 1]
		},
		getVisibleTotal: function() {
			return this.ciArr.length
		},
		hide: function(ui) {
			var that = this.that,
				columns = that.columns;
			ui.diShow = ui.diShow || [];
			ui.diHide = ui.diHide || [];
			if (that._trigger("beforeHideCols", null, ui) !== false) {
				ui.diShow = ui.diShow.filter(function(di) {
					var col = columns[di];
					if (col.hidden) {
						delete col.hidden;
						return true
					}
				});
				ui.diHide = ui.diHide.filter(function(di) {
					var col = columns[di];
					if (!col.hidden) {
						col.hidden = true;
						return true
					}
				});
				that.refresh({
					colModel: true
				});
				that._trigger("hideCols", null, ui)
			}
		},
		init: function(ui) {
			var self = this,
				that = self.that,
				o = that.options,
				obj, CMT = o.columnTemplate,
				CM, oCM = o.colModel;
			if (!oCM) {
				self.autoGenColumns();
				oCM = o.colModel
			}
			obj = self.nestedCols(oCM);
			that.depth = obj.depth;
			CM = that.colModel = obj.colModel;
			if (CMT) {
				self.extend(CM, CMT)
			}
			self.getHeaderCells();
			self.assignRowSpan();
			self.cacheIndices();
			self.initTypeColumns();
			that._trigger("CMInit", null, ui)
		},
		initTypeColumns: function() {
			var that = this.that,
				CM = that.colModel,
				i = 0,
				len = CM.length,
				di, columns = that.columns,
				iCB = that.iCheckBox = that.iCheckBox || {};
			for (di in iCB) {
				if (iCB[di].colUI != columns[di]) {
					iCB[di].destroy();
					delete iCB[di]
				}
			}
			for (; i < len; i++) {
				var column = CM[i],
					type = column.type;
				if (type) {
					if (type == "checkbox" || type == "checkBoxSelection") {
						di = column.dataIndx;
						column.type = "checkbox";
						iCB[di] = iCB[di] || new _pq.cCheckBoxColumn(that, column)
					} else if (type == "detail" && !that.iHierarchy) {
						column.dataIndx = "pq_detail";
						that.iHierarchy = new _pq.cHierarchy(that, column)
					}
				}
			}
		},
		nestedCols: function(colMarr, _depth, _hidden, parent) {
			var len = colMarr.length,
				arr = [],
				_depth = _depth || 1,
				i = 0,
				new_depth = _depth,
				colSpan = 0,
				width = 0,
				childCount = 0,
				o_colspan = 0;
			for (; i < len; i++) {
				var column = colMarr[i],
					child_CM = column.colModel,
					obj;
				column.parent = parent;
				if (_hidden === true) {
					column.hidden = _hidden
				}
				if (child_CM && child_CM.length) {
					column.collapsible && this.collapse(column);
					obj = this.nestedCols(child_CM, _depth + 1, column.hidden, column);
					arr = arr.concat(obj.colModel);
					if (obj.colSpan > 0) {
						if (obj.depth > new_depth) {
							new_depth = obj.depth
						}
						column.colSpan = obj.colSpan;
						colSpan += obj.colSpan
					} else {
						column.colSpan = 0
					}
					o_colspan += obj.o_colspan;
					column.o_colspan = obj.o_colspan;
					column.childCount = obj.childCount;
					childCount += obj.childCount
				} else {
					if (column.hidden) {
						column.colSpan = 0
					} else {
						column.colSpan = 1;
						colSpan++
					}
					o_colspan++;
					column.o_colspan = 1;
					column.childCount = 0;
					childCount++;
					arr.push(column)
				}
			}
			return {
				depth: new_depth,
				colModel: arr,
				colSpan: colSpan,
				width: width,
				childCount: childCount,
				o_colspan: o_colspan
			}
		},
		reduce: function(cb, cm) {
			var that = this.that,
				newCM = [];
			(cm || that.options.colModel).forEach(function(col, ci) {
				var newCol = cb.call(that, col, ci),
					ret, _cm;
				if (newCol) {
					_cm = newCol.colModel;
					if (_cm && _cm.length) {
						ret = this.reduce(cb, _cm);
						if (ret.length) {
							newCol.colModel = ret;
							newCM.push(newCol)
						}
					} else {
						newCM.push(newCol)
					}
				}
			}, this);
			return newCM
		},
		reverse: function(cm) {
			var self = this,
				that = self.that,
				c;
			(cm || that.options.colModel).reverse().forEach(function(col) {
				(c = col.colModel) && self.reverse(c)
			});
			if (!cm) that.refreshCM()
		}
	}
})(jQuery);
(function($) {
	$.extend($.paramquery.pqGrid.prototype, {
		parent: function() {
			return this._parent
		},
		child: function(_ui) {
			var ui = this.normalize(_ui),
				rd = ui.rowData || {},
				pq_detail = rd.pq_detail || {},
				child = pq_detail.child;
			return child
		}
	});

	function cHierarchy(that, column) {
		var self = this,
			o = that.options,
			DMht;
		self.that = that;
		self.type = "detail";
		self.refreshComplete = true;
		self.rowHtDetail = (DMht = o.detailModel.height) == "auto" ? 1 : DMht;
		that.on("cellClick", self.toggle.bind(self)).on("cellKeyDown", function(evt, ui) {
			if (evt.keyCode == $.ui.keyCode.ENTER) {
				return self.toggle(evt, ui)
			}
		}).on("beforeViewEmpty", self.onBeforeViewEmpty.bind(self)).on("autoRowHeight", self.onAutoRowHeight.bind(self)).one("render", function() {
			that.iRenderB.removeView = self.removeView(self, that);
			that.iRenderB.renderView = self.renderView(self, that)
		}).one("destroy", self.onDestroy.bind(self));
		column._render = self.renderCell.bind(self)
	}
	$.paramquery.cHierarchy = cHierarchy;
	cHierarchy.prototype = {
		detachCells: function($cells) {
			$cells.children().detach();
			$cells.remove()
		},
		getCls: function() {
			return "pq-detail-cont-" + this.that.uuid
		},
		getId: function(rip) {
			return "pq-detail-" + rip + "-" + this.that.uuid
		},
		getRip: function(div) {
			return div.id.split("-")[2] * 1
		},
		onAutoRowHeight: function() {
			var self = this,
				iR = this.that.iRenderB;
			iR.$ele.find("." + self.getCls()).each(function(i, detail) {
				var rip = self.getRip(detail),
					top = iR.getHeightCell(rip);
				$(detail).css("top", top)
			})
		},
		onBeforeViewEmpty: function(evt, ui) {
			var rip = ui.rowIndxPage,
				iR = this.that.iRenderB,
				region = ui.region,
				selector = rip >= 0 ? "#" + this.getId(rip) : "." + this.getCls(),
				$details = rip >= 0 ? iR.$ele.find(selector) : iR["$c" + region].find(selector);
			this.detachCells($details)
		},
		onDestroy: function() {
			(this.that.getData() || []).forEach(function(rd) {
				rd.child && rd.child.remove()
			})
		},
		onResize: function(self, $cell) {
			var arr = [],
				timeID;
			pq.onResize($cell[0], function() {
				arr.push($cell[0]);
				clearTimeout(timeID);
				timeID = setTimeout(function() {
					var pdata = self.that.pdata,
						arr2 = [];
					arr.forEach(function(ele) {
						if (document.body.contains(ele)) {
							var rip = self.getRip(ele),
								newHt = ele.offsetHeight,
								rd = pdata[rip],
								oldHt = rd.pq_detail.height || self.rowHtDetail;
							if (oldHt != newHt) {
								rd.pq_detail.height = newHt;
								arr2.push([rip, newHt - oldHt])
							}
						}
					});
					arr = [];
					if (arr2.length) {
						self.that._trigger("onResizeHierarchy");
						self.softRefresh(arr2)
					}
				}, 150)
			})
		},
		removeView: function(self, that) {
			var orig = that.iRenderB.removeView;
			return function(r1, r2, c1) {
				var ret = orig.apply(this, arguments),
					cls = self.getCls(),
					i, row, $row, $detail, region = this.getCellRegion(r1, c1);
				for (i = r1; i <= r2; i++) {
					row = this.getRow(i, region);
					if (row && row.children.length == 1) {
						$row = $(row);
						$detail = $row.children("." + cls);
						if ($detail.length == 1) {
							self.detachCells($detail);
							row.parentNode.removeChild(row)
						}
					}
				}
				return ret
			}
		},
		renderView: function(self, that) {
			var orig = that.iRenderB.renderView;
			return function(r1, r2, c1, c2) {
				var ret = orig.apply(this, arguments),
					iR = that.iRenderB;
				var cls = self.getCls() + " pq-detail",
					o = that.options,
					ri, rowData, rtl = o.rtl,
					paddingLeft = that.dims.wdContLeft + 5,
					padding = "padding-" + (rtl ? "right:" : "left:") + paddingLeft + "px;",
					fr = o.freezeRows,
					DM = o.detailModel,
					initDetail = DM.init,
					data = this.data;
				if (!self.refreshComplete) {
					return
				}
				self.refreshComplete = false;
				for (ri = r1; ri <= r2; ri++) {
					rowData = data[ri];
					if (rowData && !rowData.pq_hidden) {
						var pq_detail = rowData.pq_detail = rowData.pq_detail || {},
							show = pq_detail.show,
							$detail = pq_detail.child;
						if (!show) continue;
						if (!$detail) {
							if (typeof initDetail == "function") {
								$detail = initDetail.call(that, {
									rowData: rowData
								});
								pq_detail.child = $detail
							}
						}
						var $cell = $detail.parent(),
							top = iR.getHeightCell(ri),
							style = "position:absolute;left:0;top:" + top + "px;padding:5px;width:100%;overflow:hidden;" + padding;
						if ($cell.length) {
							if (!document.body.contains($cell[0])) {
								throw "incorrectly detached detail"
							}
							$cell.css({
								top: top
							})
						} else {
							$cell = $("<div role='gridcell' id='" + self.getId(ri) + "' class='" + cls + "' style='" + style + "'></div>").append($detail);
							$(iR.getRow(ri, ri < fr ? "tr" : "right")).append($cell);
							if (DM.height == "auto") self.onResize(self, $cell)
						}
						var $grids = $cell.find(".pq-grid"),
							j = 0,
							gridLen = $grids.length,
							$grid, grid;
						for (; j < gridLen; j++) {
							$grid = $($grids[j]);
							grid = $grid.pqGrid("instance");
							grid._parent = that;
							if ($grid.hasClass("pq-pending-refresh") && $grid.is(":visible")) {
								$grid.removeClass("pq-pending-refresh");
								grid.refresh()
							}
						}
					}
				}
				self.refreshComplete = true;
				return ret
			}
		},
		renderCell: function(ui) {
			var DTM = this.that.options.detailModel,
				cellData = ui.cellData,
				rd = ui.rowData,
				hicon;
			if (rd.pq_gsummary || rd.pq_gtitle) {
				return ""
			}
			hicon = cellData && cellData.show ? DTM.expandIcon : DTM.collapseIcon;
			return "<div class='ui-icon " + hicon + "'></div>"
		},
		rowExpand: function(_objP) {
			var that = this.that,
				objP = that.normalize(_objP),
				o = that.options,
				rowData = objP.rowData,
				rip = objP.rowIndxPage,
				detM = o.detailModel,
				pq_detail, dataIndx = "pq_detail";
			if (rowData) {
				if (that._trigger("beforeRowExpand", null, objP) === false) {
					return
				}
				pq_detail = rowData[dataIndx] = rowData[dataIndx] || {};
				pq_detail.show = true;
				if (!detM.cache) {
					this.rowInvalidate(objP)
				}
				this.softRefresh([
					[rip, pq_detail.height || this.rowHtDetail]
				], objP)
			}
		},
		rowInvalidate: function(objP) {
			var that = this.that,
				rowData = that.getRowData(objP),
				dataIndx = "pq_detail",
				pq_detail = rowData[dataIndx],
				$temp = pq_detail ? pq_detail.child : null;
			if ($temp) {
				$temp.remove();
				rowData[dataIndx].child = null
			}
		},
		rowCollapse: function(_objP) {
			var that = this.that,
				o = that.options,
				objP = that.normalize(_objP),
				rowData = objP.rowData,
				rip = objP.rowIndxPage,
				detM = o.detailModel,
				di = "pq_detail",
				pq_detail = rowData ? rowData[di] : null;
			if (pq_detail && pq_detail.show) {
				objP.close = true;
				if (that._trigger("beforeRowExpand", null, objP) === false) {
					return
				}
				if (!detM.cache) {
					this.rowInvalidate(objP)
				}
				pq_detail.show = false;
				this.softRefresh([
					[rip, -(pq_detail.height || this.rowHtDetail)]
				], objP)
			}
		},
		softRefresh: function(arr, objP) {
			var that = this.that,
				iR = that.iRenderB;
			iR.initRowHtArrDetailSuper(arr);
			iR.setPanes();
			iR.setCellDims(true);
			objP && that.refreshRow(objP);
			iR.refresh()
		},
		toggle: function(evt, ui) {
			var that = this.that,
				column = ui.column,
				rowData = ui.rowData,
				pq_detail, rowIndx = ui.rowIndx,
				type = this.type;
			if (rowData.pq_gtitle || rowData.pq_gsummary) {
				return
			}
			if (column && column.type === type) {
				pq_detail = rowData.pq_detail = rowData.pq_detail || {}, that[pq_detail.show ? "rowCollapse" : "rowExpand"]({
					rowIndx: rowIndx
				})
			}
		}
	}
})(jQuery);
(function($) {
	var cCells = function(that) {
		var self = this;
		self.that = that;
		self.class = "pq-grid-overlay";
		self.rtl = that.options.rtl ? "right" : "left";
		self.ranges = [];
		that.on("assignTblDims", self.onRefresh(self, that))
	};
	$.paramquery.cCells = cCells;
	cCells.prototype = {
		addBlock: function(range, remove) {
			if (!range || !this.addUnique(this.ranges, range)) {
				return
			}
			var that = this.that,
				r1 = range.r1,
				c1 = range.c1,
				r2 = range.r2,
				c2 = range.c2,
				_cls = this.serialize(r1, c1, r2, c2),
				cls = _cls,
				clsN = _cls + " pq-number-overlay",
				clsH = _cls + " pq-head-overlay",
				iRender = that.iRenderB,
				gct = function(ri, ci) {
					return iRender.getCellCont(ri, ci)
				},
				tmp = this.shiftRC(r1, c1, r2, c2);
			if (!tmp) {
				return
			}
			r1 = tmp[0];
			c1 = tmp[1];
			r2 = tmp[2];
			c2 = tmp[3];
			var $contLT = gct(r1, c1),
				$contRB = gct(r2, c2),
				$contTR, $contBL, parLT_wd, parLT_ht, left, top, right, bottom, ht, wd;
			tmp = iRender.getCellXY(r1, c1);
			left = tmp[0] - 1;
			top = tmp[1] - 1;
			tmp = iRender.getCellCoords(r2, c2);
			right = tmp[2];
			bottom = tmp[3];
			ht = bottom - top, wd = right - left;
			if ($contLT == $contRB) {
				this.addLayer(left, top, ht, wd, cls, $contLT)
			} else {
				$contTR = gct(r1, c2);
				$contBL = gct(r2, c1);
				parLT_wd = $contLT[0].offsetWidth;
				parLT_ht = $contLT[0].offsetHeight;
				if ($contBL == $contLT) {
					this.addLayer(left, top, ht, parLT_wd - left, cls, $contLT, "border-right:0;");
					this.addLayer(0, top, ht, right, cls, $contRB, "border-left:0;")
				} else if ($contLT == $contTR) {
					this.addLayer(left, top, parLT_ht - top, wd, cls, $contLT, "border-bottom:0;");
					this.addLayer(left, 0, bottom, wd, cls, $contRB, "border-top:0;")
				} else {
					this.addLayer(left, top, parLT_ht - top, parLT_wd - left, cls, $contLT, "border-right:0;border-bottom:0");
					this.addLayer(0, top, parLT_ht - top, right, cls, $contTR, "border-left:0;border-bottom:0");
					this.addLayer(left, 0, bottom, parLT_wd - left, cls, $contBL, "border-right:0;border-top:0");
					this.addLayer(0, 0, bottom, right, cls, $contRB, "border-left:0;border-top:0")
				}
			}
			wd = that.options.numberCell.outerWidth || 0;
			this.addLayer(0, top, ht, wd, clsN, iRender.$clt, "");
			this.addLayer(0, top, ht, wd, clsN, iRender.$cleft, "");
			if (that.options.showHeader != false) {
				iRender = that.iRenderHead;
				tmp = iRender.getCellXY(0, c1);
				left = tmp[0];
				top = tmp[1];
				tmp = iRender.getCellCoords(that.headerCells.length - 1, c2);
				right = tmp[2];
				bottom = tmp[3];
				ht = bottom - top, wd = right - left;
				var $cont = iRender.$cright;
				this.addLayer(left, top, ht, wd, clsH, $cont, "");
				$cont = iRender.$cleft;
				this.addLayer(left, top, ht, wd, clsH, $cont, "")
			}
		},
		addLayer: function(left, top, ht, wd, cls, $cont, _style) {
			var style = this.rtl + ":" + left + "px;top:" + top + "px;height:" + ht + "px;width:" + wd + "px;" + (_style || "");
			$("<svg class='" + this.class + " " + cls + "' style='" + style + "'></svg>").appendTo($cont)
		},
		addUnique: function(ranges, range) {
			var found = ranges.filter(function(_range) {
				return range.r1 == _range.r1 && range.c1 == _range.c1 && range.r2 == _range.r2 && range.c2 == _range.c2
			})[0];
			if (!found) {
				ranges.push(range);
				return true
			}
		},
		getLastVisibleFrozenCI: function() {
			var that = this.that,
				CM = that.colModel,
				i = that.options.freezeCols - 1;
			for (; i >= 0; i--) {
				if (!CM[i].hidden) {
					return i
				}
			}
		},
		getLastVisibleFrozenRIP: function() {
			var that = this.that,
				data = that.get_p_data(),
				offset = that.riOffset,
				i = that.options.freezeRows + offset - 1;
			for (; i >= offset; i--) {
				if (!data[i].pq_hidden) {
					return i - offset
				}
			}
		},
		getSelection: function() {
			var that = this.that,
				data = that.get_p_data(),
				CM = that.colModel,
				cells = [];
			this.ranges.forEach(function(range) {
				var r1 = range.r1,
					r2 = range.r2,
					c1 = range.c1,
					c2 = range.c2,
					rd, i, j;
				for (i = r1; i <= r2; i++) {
					rd = data[i];
					for (j = c1; j <= c2; j++) {
						cells.push({
							dataIndx: CM[j].dataIndx,
							colIndx: j,
							rowIndx: i,
							rowData: rd
						})
					}
				}
			});
			return cells
		},
		isSelected: function(ui) {
			var that = this.that,
				objP = that.normalize(ui),
				ri = objP.rowIndx,
				ci = objP.colIndx;
			if (ci == null || ri == null) {
				return null
			}
			return !!this.ranges.find(function(range) {
				var r1 = range.r1,
					r2 = range.r2,
					c1 = range.c1,
					c2 = range.c2;
				if (ri >= r1 && ri <= r2 && ci >= c1 && ci <= c2) {
					return true
				}
			})
		},
		onRefresh: function(self, that) {
			var id;
			return function() {
				clearTimeout(id);
				id = setTimeout(function() {
					if (that.element) {
						self.removeAll();
						that.Selection().address().forEach(function(range) {
							self.addBlock(range)
						})
					}
				}, 50)
			}
		},
		removeAll: function() {
			var that = this.that,
				$cont = that.$cont,
				$header = that.$header;
			if ($cont) {
				$cont.children().children().children("svg").remove();
				$header.children().children().children("svg").remove()
			}
			this.ranges = []
		},
		removeBlock: function(range) {
			if (range) {
				var r1 = range.r1,
					c1 = range.c1,
					r2 = range.r2,
					c2 = range.c2,
					that = this.that,
					cls, indx = this.ranges.findIndex(function(_range) {
						return r1 == _range.r1 && c1 == _range.c1 && r2 == _range.r2 && c2 == _range.c2
					});
				if (indx >= 0) {
					this.ranges.splice(indx, 1);
					cls = "." + this.class + "." + this.serialize(r1, c1, r2, c2);
					that.$cont.find(cls).remove();
					that.$header.find(cls).remove()
				}
			}
		},
		serialize: function(r1, c1, r2, c2) {
			return "r1" + r1 + "c1" + c1 + "r2" + r2 + "c2" + c2
		},
		shiftRC: function(r1, c1, r2, c2) {
			var that = this.that,
				iM = that.iMerge,
				o = that.options,
				pdata_len = that.pdata.length,
				obj, fr = o.freezeRows,
				offset = that.riOffset;
			r1 -= offset;
			r2 -= offset;
			r1 = r1 < fr ? Math.max(r1, Math.min(0, r2)) : r1;
			if (r1 >= pdata_len || r2 < 0) {
				return
			} else {
				r2 = Math.min(r2, pdata_len - 1)
			}
			r1 += offset;
			r2 += offset;
			r1 -= offset;
			r2 -= offset;
			r1 = Math.max(r1, 0);
			r2 = Math.min(r2, pdata_len - 1);
			c2 = Math.min(c2, that.colModel.length - 1);
			return [r1, c1, r2, c2]
		}
	}
})(jQuery);
(function($) {
	$.paramquery.pqGrid.prototype.Range = function(range, expand) {
		return new pq.Range(this, range, "range", expand)
	};
	var Range = pq.Range = function(that, range, type, expand) {
		if (that == null) {
			throw "invalid param"
		}
		this.that = that;
		this._areas = [];
		if (this instanceof Range == false) {
			return new Range(that, range, type, expand)
		}
		this._type = type || "range";
		this.init(range, expand)
	};
	Range.prototype = $.extend({
		add: function(range) {
			this.init(range)
		},
		address: function() {
			return this._areas
		},
		addressLast: function() {
			var areas = this.address();
			return areas[areas.length - 1]
		},
		history: function(prop) {
			var oldS = {},
				newS = {},
				oldR = {},
				newR = {},
				rows = {},
				rowr = {},
				oldC = {},
				newC = {},
				cols = {},
				that = this.that,
				cellprop = "pq_cell" + prop,
				rowprop = "pq_row" + prop,
				undo = function(redo) {
					var fn = function(rowX, newX, oldX, prop) {
						for (var ri in rowX) {
							var key, dest = rowX[ri][prop],
								src = redo ? newX[ri] : oldX[ri];
							src = $.extend(true, {}, src);
							for (key in dest) {
								dest[key] = src[key]
							}
							for (key in src) {
								dest[key] = src[key]
							}
						}
					};
					fn(rows, newS, oldS, cellprop);
					fn(cols, newC, oldC, prop);
					fn(rowr, newR, oldR, rowprop);
					that.refresh()
				};
			return {
				add: function(rd, col, cell) {
					function a(rd, di, oldS, rows, prop) {
						var ri = rd[di];
						if (!oldS[ri]) {
							rows[ri] = rd;
							oldS[ri] = $.extend(true, {}, rd[prop])
						}
					}
					if (cell) {
						a(rd, "pq_ri", oldS, rows, cellprop)
					} else if (col) {
						a(col, "dataIndx", oldC, cols, prop)
					} else {
						a(rd, "pq_ri", oldR, rowr, rowprop)
					}
				},
				push: function() {
					function l(obj) {
						return Object.keys(obj).length
					}

					function a(rows, newS, prop) {
						for (var ri in rows) {
							newS[ri] = $.extend(true, {}, rows[ri][prop])
						}
					}
					if (l(rows) || l(cols) || l(rowr)) {
						a(rows, newS, cellprop);
						a(cols, newC, prop);
						a(rowr, newR, rowprop);
						that.iHistory.push({
							callback: undo
						})
					}
				}
			}
		},
		refreshStop: function() {
			this._stop = true
		},
		refresh: function() {
			this.that.refresh();
			this._stop = false
		},
		setAPS: function(key, val, str) {
			var self = this,
				that = self.that,
				typeRow, typeCol, cellstr = "pq_cell" + str,
				rowstr = "pq_row" + str,
				ca, typeAttr = str == "attr",
				h = self.history(str),
				a = function(rd, di, val) {
					if (val != null || rd[cellstr]) {
						ca = rd[cellstr] = rd[cellstr] || {};
						ca = ca[di] = ca[di] || {};
						if (ca[key] != val) {
							h.add(rd, null, true);
							ca[key] = val
						}
					}
				};
			self.each(function(rd, di, col, type, ri, ci) {
				typeCol = type == "column";
				typeRow = type == "row";
				if ((typeCol || typeRow) && !typeAttr) {
					if (typeCol) {
						self.addProp(col);
						ca = col[str] = col[str] || {}
					} else {
						ca = rd[rowstr] = rd[rowstr] || {}
					}
					if (ca[key] != val) {
						if (typeCol) h.add(null, col);
						else h.add(rd);
						ca[key] = val
					}
					that.Range(typeCol ? {
						c1: ci,
						c2: ci
					} : {
						r1: ri,
						r2: ri
					}, false).each(function(rd, di) {
						var valO;
						if (typeCol) {
							if ((rd[rowstr] || {})[key] != null) {
								valO = val
							}
						}
						a(rd, di, valO)
					}, true)
				} else {
					a(rd, di, val)
				}
			}, typeAttr);
			h.push();
			self._stop || self.refresh()
		},
		addProp: function(column) {
			column.prop = column.prop || {get align() {
					return column.align
				},
				set align(val) {
					column.align = val
				},
				get format() {
					return column.format
				},
				set format(val) {
					column.format = val
				},
				get valign() {
					return column.valign
				},
				set valign(val) {
					column.valign = val
				},
				get edit() {
					return column.editable
				},
				set edit(val) {
					column.editable = val
				}
			}
		},
		setAttr: function(str, val) {
			this.setAPS(str, val, "attr")
		},
		setStyle: function(str, val) {
			this.setAPS(str, val, "style")
		},
		setProp: function(str, val) {
			this.setAPS(str, val, "prop")
		},
		clear: function() {
			return this.copy({
				copy: false,
				cut: true,
				source: "clear"
			})
		},
		clearOther: function(_range) {
			var range = this._normal(_range, true),
				sareas = this.address(),
				i;
			for (i = sareas.length - 1; i >= 0; i--) {
				var srange = sareas[i];
				if (!(srange.r1 == range.r1 && srange.c1 == range.c1 && srange.r2 == range.r2 && srange.c2 == range.c2)) {
					sareas.splice(i, 1)
				}
			}
		},
		clone: function() {
			return this.that.Range(this._areas)
		},
		_cellAttr: function(rd, di) {
			var cellattr = rd.pq_cellattr = rd.pq_cellattr || {},
				ca = cellattr[di] = cellattr[di] || {};
			return ca
		},
		comment: function(text) {
			return this.attr("title", text)
		},
		pic: function(file, x, y) {
			var self = this,
				grid = self.that,
				P = grid.Pic(),
				ri = 0,
				ci = 0;
			self.each(function(rd, di, col, type, _ri, _ci) {
				ri = _ri;
				ci = _ci;
				return false
			});
			pq.fileToBase(file, function(src) {
				P.add(P.name(file.name), src, [ci, x || 0, ri, y || 0])
			})
		},
		_copyArea: function(r1, r2, c1, c2, CM, buffer, rowList, p_data, cut, copy, render, header) {
			var that = this.that,
				cv, cv2, str, ri, ci, di, column, dataType, readCell = that.readCell,
				getRenderVal = this.getRenderVal,
				iMerge = that.iMerge,
				stringType = [],
				rowBuffer = [],
				offset = that.riOffset,
				iGV = that.iRenderB;
			for (ci = c1; ci <= c2; ci++) {
				column = CM[ci];
				dataType = column.dataType;
				stringType[ci] = !dataType || dataType == "string" || dataType == "html";
				if (header) rowBuffer.push(this.getTitle(column, ci))
			}
			if (header) buffer.push(rowBuffer.join("	") || " ");
			for (ri = r1; ri <= r2; ri++) {
				var rd = p_data[ri],
					newRow = {},
					oldRow = {},
					objR = {
						rowIndx: ri,
						rowIndxPage: ri - offset,
						rowData: rd,
						Export: true,
						exportClip: true
					};
				if (rd.pq_copy === false) {
					continue
				}
				rowBuffer = [];
				for (ci = c1; ci <= c2; ci++) {
					column = CM[ci];
					di = column.dataIndx;
					if (column.copy === false) {
						continue
					}
					cv = rd[di];
					if (copy) {
						cv2 = readCell(rd, column, iMerge, ri, ci);
						if (cv2 === cv) {
							objR.colIndx = ci;
							objR.column = column;
							objR.dataIndx = di;
							cv2 = getRenderVal(objR, render, iGV)[0];
							if (stringType[ci] && /(\r|\n)/.test(cv2)) {
								cv2 = this.newLine(cv2)
							}
						}
						rowBuffer.push(cv2)
					}
					if (cut && cv !== undefined) {
						newRow[di] = undefined;
						oldRow[di] = cv
					}
				}
				if (cut) {
					rowList.push({
						rowIndx: ri,
						rowData: rd,
						oldRow: oldRow,
						newRow: newRow
					})
				}
				str = rowBuffer.join("	");
				buffer.push(str || " ")
			}
		},
		copy: function(ui) {
			ui = ui || {};
			var that = this.that,
				dest = ui.dest,
				cut = !!ui.cut,
				copy = ui.copy == null ? true : ui.copy,
				source = ui.source || (cut ? "cut" : "copy"),
				history = ui.history,
				allowInvalid = ui.allowInvalid,
				rowList = [],
				buffer = [],
				p_data = that.get_p_data(),
				CM = that.colModel,
				render = ui.render,
				header = ui.header,
				type, r1, c1, r2, c2, CPM = that.options.copyModel,
				areas = this.address();
			history = history == null ? true : history;
			allowInvalid = allowInvalid == null ? true : allowInvalid;
			render = render == null ? CPM.render : render;
			header = header == null ? CPM.header : header;
			if (!areas.length) {
				return
			}
			areas.forEach(function(area) {
				type = area.type, r1 = area.r1, c1 = area.c1, r2 = type === "cell" ? r1 : area.r2, c2 = type === "cell" ? c1 : area.c2;
				this._copyArea(r1, r2, c1, c2, CM, buffer, rowList, p_data, cut, copy, render, header)
			}, this);
			if (copy) {
				var str = buffer.join("\n");
				if (ui.clip) {
					var $clip = ui.clip;
					$clip.val(str);
					$clip.select()
				} else {
					that._setGlobalStr(str)
				}
			}
			if (dest) {
				that.paste({
					dest: dest,
					rowList: rowList,
					history: history,
					allowInvalid: allowInvalid
				})
			} else if (cut) {
				var ret = that._digestData({
					updateList: rowList,
					source: source,
					history: history,
					allowInvalid: allowInvalid
				});
				if (ret !== false) {
					that.refresh({
						source: source,
						header: false
					})
				}
			}
		},
		_countArea: function(nrange) {
			var arr = nrange,
				type = nrange.type,
				r1 = arr.r1,
				c1 = arr.c1,
				r2 = arr.r2,
				c2 = arr.c2;
			if (type === "cell") {
				return 1
			} else if (type === "row") {
				return 0
			} else {
				return (r2 - r1 + 1) * (c2 - c1 + 1)
			}
		},
		count: function() {
			var type_range = this._type === "range",
				arr = this.address(),
				tot = 0,
				len = arr.length;
			for (var i = 0; i < len; i++) {
				tot += type_range ? this._countArea(arr[i]) : 1
			}
			return tot
		},
		cut: function(ui) {
			ui = ui || {};
			ui.cut = true;
			return this.copy(ui)
		},
		_eachRC: function(fn, data, r1, r2) {
			this._areas.forEach(function(area) {
				var i = area[r1],
					c2 = area[r2];
				for (; i <= c2; i++) {
					fn(this[i], i)
				}
			}, this.that[data])
		},
		eachCol: function(fn) {
			this._eachRC(fn, "colModel", "c1", "c2")
		},
		eachRow: function(fn) {
			this._eachRC(fn, "pdata", "r1", "r2")
		},
		_hsCols: function(prop) {
			var arr = [],
				obj = {};
			this.eachCol(function(col) {
				arr.push(col.dataIndx)
			});
			obj[prop] = arr;
			this.that.Columns().hide(obj)
		},
		hideCols: function() {
			this._hsCols("diHide")
		},
		showCols: function() {
			this._hsCols("diShow")
		},
		hideRows: function() {
			this.eachRow(function(rd) {
				rd.pq_hidden = true
			})
		},
		showRows: function() {
			this.eachRow(function(rd) {
				rd.pq_hidden = false
			})
		},
		each: function(fn, all) {
			var that = this.that,
				CM = that.colModel,
				areas = this._areas,
				al = 0,
				data = that.pdata;
			for (; al < areas.length; al++) {
				var area = areas[al],
					i = area.r1,
					r2 = area.r2,
					c2 = area.c2,
					type = area.type,
					rd, j, typeColumn = type == "column",
					typeRow = type == "row",
					col;
				for (; i <= r2; i++) {
					rd = data[i];
					if (rd) {
						j = area.c1;
						j = j < 0 ? 0 : j;
						for (; j <= c2; j++) {
							col = CM[j];
							if (fn(rd, col.dataIndx, col, type, i, j) === false) return;
							if (typeRow && !all) break
						}
					}
					if (typeColumn && !all) break
				}
			}
		},
		enable: function(val) {
			val = this.prop("edit", val);
			return val == null ? true : val
		},
		getAPS: function(key, str) {
			var self = this,
				colstyle, ret, cellstyle, rowstyle;
			self.each(function(rd, di, col) {
				self.addProp(col);
				cellstyle = (rd["pq_cell" + str] || {})[di];
				cellstyle = (cellstyle || {})[key];
				rowstyle = (rd["pq_row" + str] || {})[key];
				colstyle = (col[str] || {})[key];
				ret = cellstyle == null ? rowstyle == null ? colstyle : rowstyle : cellstyle;
				return false
			});
			return ret
		},
		getAttr: function(key) {
			return this.getAPS(key, "attr")
		},
		getProp: function(key) {
			return this.getAPS(key, "prop")
		},
		getStyle: function(key) {
			return this.getAPS(key, "style")
		},
		getIndx: function(_indx) {
			return _indx == null ? this._areas.length - 1 : _indx
		},
		getValue: function() {
			var areas = this.address(),
				area, rd, arr = [],
				val, that = this.that,
				r1, c1, r2, c2, i, j, data;
			if (areas.length) {
				area = areas[0];
				r1 = area.r1;
				c1 = area.c1;
				r2 = area.r2;
				c2 = area.c2;
				data = that.get_p_data();
				for (i = r1; i <= r2; i++) {
					rd = data[i];
					for (j = c1; j <= c2; j++) {
						val = rd[that.colModel[j].dataIndx];
						arr.push(val)
					}
				}
				return arr
			}
		},
		indexOf: function(range) {
			range = this._normal(range);
			var r1 = range.r1,
				c1 = range.c1,
				r2 = range.r2,
				c2 = range.c2,
				areas = this.address(),
				i = 0,
				len = areas.length,
				a;
			for (; i < len; i++) {
				a = areas[i];
				if (r1 >= a.r1 && r2 <= a.r2 && c1 >= a.c1 && c2 <= a.c2) {
					return i
				}
			}
			return -1
		},
		index: function(range) {
			range = this._normal(range);
			var type = range.type,
				r1 = range.r1,
				c1 = range.c1,
				r2 = range.r2,
				c2 = range.c2,
				areas = this.address(),
				i = 0,
				len = areas.length,
				a;
			for (; i < len; i++) {
				a = areas[i];
				if (type === a.type && r1 === a.r1 && r2 === a.r2 && c1 === a.c1 && c2 === a.c2) {
					return i
				}
			}
			return -1
		},
		init: function(range, expand) {
			expand = expand !== false;
			if (range) {
				if (typeof range.push == "function") {
					for (var i = 0, len = range.length; i < len; i++) {
						this.init(range[i], expand)
					}
				} else if (typeof range == "string") {
					this.init(pq.getAddress(range), expand)
				} else {
					var nrange = this._normal(range, expand),
						areas = this._areas = this._areas || [];
					if (nrange) {
						areas.push(nrange)
					}
				}
			}
		},
		isValid: function() {
			var areas = this._areas;
			return !!areas.length
		},
		format: function(val) {
			return this.prop("format", val)
		},
		merge: function(ui) {
			ui = ui || {};
			var that = this.that,
				o = that.options,
				mc = o.mergeCells,
				areas = this._areas,
				rc, cc, area = areas[0];
			if (area) {
				rc = area.r2 - area.r1 + 1;
				cc = area.c2 - area.c1 + 1;
				if (rc > 1 || cc > 1) {
					area.rc = rc;
					area.cc = cc;
					mc.push(area);
					if (ui.refresh !== false) {
						that.refreshView()
					}
				}
			}
		},
		newLine: function(cv) {
			return '"' + cv.replace(/"/g, '""') + '"'
		},
		replace: function(_range, _indx) {
			var range = this._normal(_range),
				sareas = this._areas,
				indx = this.getIndx(_indx);
			sareas.splice(indx, 1, range)
		},
		remove: function(range) {
			var areas = this._areas,
				indx = this.indexOf(range);
			if (indx >= 0) {
				areas.splice(indx, 1)
			}
		},
		resize: function(_range, _indx) {
			var range = this._normal(_range),
				sareas = this._areas,
				indx = this.getIndx(_indx),
				sarea = sareas[indx];
			["r1", "c1", "r2", "c2", "rc", "cc", "type"].forEach(function(key) {
				sarea[key] = range[key]
			});
			return this
		},
		rows: function(indx) {
			var that = this.that,
				narr = [],
				arr = this.addressLast();
			if (arr) {
				var r1 = arr.r1,
					c1 = arr.c1,
					r2 = arr.r2,
					c2 = arr.c2,
					type = arr.type,
					indx1 = indx == null ? r1 : r1 + indx,
					indx2 = indx == null ? r2 : r1 + indx;
				for (var i = indx1; i <= indx2; i++) {
					narr.push({
						r1: i,
						c1: c1,
						r2: i,
						c2: c2,
						type: type
					})
				}
			}
			return pq.Range(that, narr, "row")
		},
		_normal: function(range, expand) {
			if (range.type) {
				return range
			}
			var arr;
			if (typeof range.push == "function") {
				arr = [];
				for (var i = 0, len = range.length; i < len; i++) {
					var ret = this._normal(range[i], expand);
					if (ret) {
						arr.push(ret)
					}
				}
				return arr
			}
			var that = this.that,
				data = that.get_p_data(),
				rmax = data.length - 1,
				CM = that.colModel,
				cmax = CM.length - 1,
				r1 = range.r1,
				c1 = range.c1,
				r1 = r1 > rmax ? rmax : r1,
				c1 = c1 > cmax ? cmax : c1,
				rc = range.rc,
				cc = range.cc,
				r2 = range.r2,
				c2 = range.c2,
				tmp, type;
			if (cmax < 0 || rmax < 0) {
				return null
			}
			if (r1 == null && c1 == null) {
				return
			}
			if (r1 > r2) {
				tmp = r1;
				r1 = r2;
				r2 = tmp
			}
			if (c1 > c2) {
				tmp = c1;
				c1 = c2;
				c2 = tmp
			}
			if (r1 == null) {
				r1 = 0;
				r2 = rmax;
				c2 = c2 == null ? c1 : c2;
				type = "column"
			} else if (c1 == null) {
				if (!range._type) {}
				c1 = 0;
				r2 = r2 == null ? r1 : r2;
				c2 = cmax;
				type = range._type || "row"
			} else if (r2 == null && rc == null || r1 == r2 && c1 == c2) {
				type = "cell";
				r2 = r1;
				c2 = c1
			} else {
				type = "block"
			}
			r2 = rc ? r1 + rc - 1 : r2;
			c2 = cc ? c1 + cc - 1 : c2;
			r2 = r2 > rmax ? rmax : r2;
			c2 = c2 > cmax ? cmax : c2;
			if (expand && (type == "block" || type == "cell")) {
				arr = that.iMerge.inflateRange(r1, c1, r2, c2);
				r1 = arr[0];
				c1 = arr[1];
				r2 = arr[2];
				c2 = arr[3]
			}
			rc = r2 - r1 + 1;
			cc = c2 - c1 + 1;
			range.r1 = r1;
			range.c1 = c1;
			range.r2 = r2;
			range.c2 = c2;
			range.rc = rc;
			range.cc = cc;
			range.type = range.type || type;
			return range
		},
		select: function() {
			var that = this.that,
				iS = that.iSelection,
				areas = this._areas;
			if (areas.length) {
				iS.removeAll({
					trigger: false
				});
				areas.forEach(function(area) {
					iS.add(area, false)
				});
				iS.trigger()
			}
			return this
		},
		style: function(key, val) {
			return this._prop(key, val, "Style")
		},
		_prop: function(key, val, str) {
			return this[(val != null ? "set" : "get") + str](key, val)
		},
		attr: function(key, val) {
			return this._prop(key, val, "Attr")
		},
		prop: function(key, val) {
			return this._prop(key, val, "Prop")
		},
		toggleStyle: function(key, arr) {
			var val = this.getStyle(key),
				val2 = !val || val == arr[1] ? arr[0] : arr[1];
			this.style(key, val2)
		},
		unmerge: function(ui) {
			ui = ui || {};
			var that = this.that,
				o = that.options,
				mc = o.mergeCells,
				areas = this._areas,
				area = areas[0];
			if (area) {
				for (var i = 0; i < mc.length; i++) {
					var mcRec = mc[i];
					if (mcRec.r1 === area.r1 && mcRec.c1 === area.c1) {
						mc.splice(i, 1);
						break
					}
				}
				if (ui.refresh !== false) {
					that.refreshView()
				}
			}
		},
		align: function(val) {
			return this.prop("align", val)
		},
		valign: function(val) {
			return this.prop("valign", val)
		},
		value: function(val) {
			var ii = 0,
				that = this.that,
				CM = that.colModel,
				area, r1, c1, r2, c2, rowList = [],
				areas = this.address();
			if (val === undefined) {
				return this.getValue()
			}
			for (var i = 0; i < areas.length; i++) {
				area = areas[i];
				r1 = area.r1;
				c1 = area.c1;
				r2 = area.r2;
				c2 = area.c2;
				for (var j = r1; j <= r2; j++) {
					var obj = that.normalize({
							rowIndx: j
						}),
						rd = obj.rowData,
						ri = obj.rowIndx,
						oldRow = {},
						newRow = {};
					for (var k = c1; k <= c2; k++) {
						var dataIndx = CM[k].dataIndx;
						newRow[dataIndx] = val[ii++];
						oldRow[dataIndx] = rd[dataIndx]
					}
					rowList.push({
						rowData: rd,
						rowIndx: ri,
						newRow: newRow,
						oldRow: oldRow
					})
				}
			}
			if (rowList.length) {
				that._digestData({
					updateList: rowList,
					source: "range"
				});
				that.refresh({
					header: false
				})
			}
			return this
		},
		val2D: function() {
			var D2 = [],
				grid = this.that,
				obj = {},
				key;
			this._areas.forEach(function(a) {
				var c1 = a.c1,
					c2 = a.c2,
					ri = a.r1,
					val;
				for (; ri <= a.r2; ri++) {
					val = grid.Range({
						r1: ri,
						rc: 1,
						c1: c1,
						c2: c2
					}).value();
					obj[ri] = obj[ri] ? obj[ri].concat(val) : val
				}
			});
			for (key in obj) {
				D2.push(obj[key])
			}
			return D2
		}
	}, pq.mixin.render);

	function selectEndDelegate(evt) {
		if (!evt.shiftKey || evt.type == "pqGrid:mousePQUp") {
			this._trigger("selectEnd", null, {
				selection: this.Selection()
			});
			this.off("mousePQUp", selectEndDelegate);
			this.off("keyUp", selectEndDelegate)
		}
	}
	var Selection = pq.Selection = function(that, range) {
		if (that == null) {
			throw "invalid param"
		}
		if (this instanceof Selection == false) {
			return new Selection(that, range)
		}
		this._areas = [];
		this.that = that;
		this.iCells = new $.paramquery.cCells(that);
		this._base(that, range)
	};
	pq.extend(Range, Selection, {
		add: function(range, trigger) {
			var narea = this._normal(range, true),
				iC = this.iCells,
				indx = this.indexOf(narea);
			if (indx >= 0) {
				return
			}
			iC.addBlock(narea);
			this._super(narea);
			if (trigger !== false) {
				this.trigger()
			}
		},
		clearOther: function(_range, noTrigger) {
			var iCells = this.iCells,
				range = this._normal(_range, true);
			this.address().forEach(function(srange) {
				if (!(srange.r1 == range.r1 && srange.c1 == range.c1 && srange.r2 == range.r2 && srange.c2 == range.c2)) {
					iCells.removeBlock(srange)
				}
			});
			this._super(range);
			noTrigger || this.trigger()
		},
		getSelection: function() {
			return this.iCells.getSelection()
		},
		isSelected: function(ui) {
			return this.iCells.isSelected(ui)
		},
		removeAll: function(ui) {
			ui = ui || {};
			if (this._areas.length) {
				this.iCells.removeAll();
				this._areas = [];
				if (ui.trigger !== false) {
					this.trigger()
				}
			}
		},
		resizeOrReplace: function(range, indx) {
			this.resize(range, indx) || this.replace(range, indx)
		},
		replace: function(_range, _indx) {
			var iCells = this.iCells,
				range = this._normal(_range),
				sareas = this._areas,
				indx = this.getIndx(_indx),
				srange = sareas[indx];
			iCells.removeBlock(srange);
			iCells.addBlock(range);
			this._super(range, indx);
			this.trigger()
		},
		resize: function(_range, _indx) {
			var range = this._normal(_range, true),
				r1 = range.r1,
				c1 = range.c1,
				r2 = range.r2,
				c2 = range.c2,
				sareas = this._areas || [];
			if (!sareas.length) {
				return false
			}
			var indx = this.getIndx(_indx),
				srange = sareas[indx],
				sr1 = srange.r1,
				sc1 = srange.c1,
				sr2 = srange.r2,
				sc2 = srange.c2,
				topLeft = sr1 === r1 && sc1 === c1,
				topRight = sr1 === r1 && sc2 === c2,
				bottomLeft = sr2 === r2 && sc1 === c1,
				bottomRight = sr2 === r2 && sc2 === c2;
			if (topLeft && topRight && bottomLeft && bottomRight) {
				return true
			}
		},
		selectAll: function(ui) {
			ui = ui || {};
			var type = ui.type,
				that = this.that,
				CM = that.colModel,
				all = ui.all,
				r1 = all ? 0 : that.riOffset,
				data_len = all ? that.get_p_data().length : that.pdata.length,
				cm_len = CM.length - 1,
				range, r2 = r1 + data_len - 1;
			if (type === "row") {
				range = {
					r1: r1,
					r2: r2
				}
			} else {
				range = {
					c1: 0,
					c2: cm_len,
					_type: "column",
					r1: 0,
					r2: r2
				}
			}
			that.Range(range).select();
			return this
		},
		trigger: function() {
			var that = this.that;
			that._trigger("selectChange", null, {
				selection: this
			});
			that.off("mousePQUp", selectEndDelegate);
			that.off("keyUp", selectEndDelegate);
			that.on("mousePQUp", selectEndDelegate);
			that.on("keyUp", selectEndDelegate)
		}
	})
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	$.widget("paramquery.pqToolbar", {
		options: {
			items: [],
			gridInstance: null,
			events: {
				button: "click",
				select: "change",
				checkbox: "change",
				textbox: "change",
				textarea: "change",
				file: "change"
			}
		},
		_create: function() {
			var o = this.options,
				that = o.gridInstance,
				events = o.events,
				event, listener, bootstrap = o.bootstrap,
				BS_on = bootstrap.on,
				CM = that.colModel,
				timeout = that.options.filterModel.timeout,
				items = o.items,
				element = this.element,
				i = 0,
				len = items.length;
			element.addClass("pq-toolbar");
			for (; i < len; i++) {
				var item = items[i],
					type = item.type,
					ivalue = item.value,
					icon = item.icon,
					options = item.options || {},
					label = item.label,
					init = item.init,
					listener = item.listener,
					listeners = listener ? [listener] : item.listeners,
					listeners = listeners || [function() {}],
					itemcls = item.cls,
					cls = itemcls ? itemcls : "",
					cls = BS_on && type == "button" ? bootstrap.btn + " " + cls : cls,
					cls = cls ? "class='" + cls + "'" : "",
					itemstyle = item.style,
					style = itemstyle ? "style='" + itemstyle + "'" : "",
					attr = item.attr || "",
					labelOpen = label ? "<label " + style + ">" + label : "",
					labelClose = label ? "</label>" : "",
					strStyleClsAttr = label && type != "button" && type != "file" ? [cls, attr] : [cls, attr, style],
					strStyleClsAttr = strStyleClsAttr.join(" "),
					inp, $ctrl, $ctrlInner;
				item.options = options;
				if (type == "textbox") {
					$ctrl = $([labelOpen, "<input type='text' " + strStyleClsAttr + ">", labelClose].join(""))
				} else if (type == "textarea") {
					$ctrl = $([labelOpen, "<textarea " + strStyleClsAttr + "></textarea>", labelClose].join(""))
				} else if (type == "select") {
					if (typeof options === "function") {
						options = options.call(that, {
							colModel: CM
						})
					}
					options = options || [];
					inp = _pq.select({
						options: options,
						attr: strStyleClsAttr,
						prepend: item.prepend,
						groupIndx: item.groupIndx,
						valueIndx: item.valueIndx,
						labelIndx: item.labelIndx
					});
					$ctrl = $([labelOpen, inp, labelClose].join(""))
				} else if (type == "file") {
					cls = icon && label ? "ui-button-text-icon-primary" : icon ? "ui-button-icon-only" : "ui-button-text-only";
					$ctrl = $(["<label class='ui-button ui-widget ui-state-default ui-corner-all " + cls + "' " + attr + " " + style + ">", "<input type='file' style='display:none;' " + (item.attrFile || "") + ">", icon ? "<span class='ui-button-icon-primary ui-icon " + icon + "'></span>" : "", "<span class='ui-button-text'>" + (label || "") + "</span>", "</label>"].join(""))
				} else if (type == "checkbox") {
					$ctrl = $([label ? "<label " + style + ">" : "", "<input type='checkbox' ", ivalue ? "checked='checked' " : "", strStyleClsAttr, ">", label ? label + "</label>" : ""].join(""))
				} else if (type == "separator") {
					$ctrl = $("<span class='pq-separator' " + [attr, style].join(" ") + "></span>")
				} else if (type == "button") {
					var bicon = "";
					if (BS_on) {
						bicon = icon ? "<span class='glyphicon " + icon + "'></span>" : ""
					}
					$ctrl = $("<button type='button' " + strStyleClsAttr + ">" + bicon + label + "</button>");
					$.extend(options, {
						label: label ? label : false,
						icon: icon,
						icons: {
							primary: BS_on ? "" : icon
						}
					});
					$ctrl.button(options)
				} else if (typeof type == "string") {
					$ctrl = $(type)
				} else if (typeof type == "function") {
					inp = type.call(that, {
						colModel: CM,
						cls: cls
					});
					$ctrl = $(inp)
				}
				$ctrl.appendTo(element);
				init && init.call(that, $ctrl[0]);
				$ctrlInner = this.getInner($ctrl, label, type);
				if (type !== "checkbox" && ivalue !== undefined) {
					$ctrlInner.val(ivalue)
				}
				for (var j = 0, lenj = listeners.length; j < lenj; j++) {
					listener = listeners[j];
					var _obj = {};
					if (typeof listener == "function") {
						_obj[events[type]] = listener
					} else {
						_obj = listener
					}
					for (event in _obj) {
						pq.fakeEvent($ctrlInner, event, timeout);
						$ctrlInner.on(event, this._onEvent(that, _obj[event], item))
					}
				}
			}
		}
	});
	$.extend(_pq.pqToolbar.prototype, {
		getInner: function($ctrl, label, type) {
			var ctrl = $ctrl[0];
			return ctrl.nodeName.toUpperCase() == "LABEL" ? $(ctrl.children[0]) : $ctrl
		},
		refresh: function() {
			this.element.empty();
			this._create()
		},
		_onEvent: function(that, cb, item) {
			return function(evt) {
				var type = item.type;
				if (type == "checkbox") {
					item.value = $(evt.target).prop("checked")
				} else {
					item.value = $(evt.target).val()
				}
				cb.call(that, evt);
				if (type == "file") {
					$(this).val("")
				}
			}
		},
		_destroy: function() {
			this.element.empty().removeClass("pq-toolbar").enableSelection()
		},
		_disable: function() {
			if (this.$disable == null) this.$disable = $("<div class='pq-grid-disable'></div>").css("opacity", .2).appendTo(this.element)
		},
		_enable: function() {
			if (this.$disable) {
				this.element[0].removeChild(this.$disable[0]);
				this.$disable = null
			}
		},
		_setOption: function(key, value) {
			if (key == "disabled") {
				if (value == true) {
					this._disable()
				} else {
					this._enable()
				}
			}
		}
	});
	pq.toolbar = function(selector, options) {
		var $p = $(selector).pqToolbar(options),
			p = $p.data("paramqueryPqToolbar") || $p.data("paramquery-pqToolbar");
		return p
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		fnGrid = _pq.pqGrid.prototype;
	fnGrid.options.trackModel = {
		on: false,
		dirtyClass: "pq-cell-dirty"
	};
	_pq.cUCData = function(that) {
		this.that = that;
		this.udata = [];
		this.ddata = [];
		this.adata = [];
		this.options = that.options;
		that.on("dataAvailable", this.onDA(this))
	};
	_pq.cUCData.prototype = {
		add: function(obj) {
			var that = this.that,
				adata = this.adata,
				ddata = this.ddata,
				rowData = obj.rowData,
				TM = this.options.trackModel,
				dirtyClass = TM.dirtyClass,
				recId = that.getRecId({
					rowData: rowData
				});
			for (var i = 0, len = adata.length; i < len; i++) {
				var rec = adata[i];
				if (recId != null && rec.recId == recId) {
					throw "primary key violation"
				}
				if (rec.rowData == rowData) {
					throw "same data can't be added twice."
				}
			}
			for (var i = 0, len = ddata.length; i < len; i++) {
				if (rowData == ddata[i].rowData) {
					ddata.splice(i, 1);
					return
				}
			}
			var dataIndxs = [];
			for (var dataIndx in rowData) {
				dataIndxs.push(dataIndx)
			}
			that.removeClass({
				rowData: rowData,
				dataIndx: dataIndxs,
				cls: dirtyClass
			});
			var obj = {
				recId: recId,
				rowData: rowData
			};
			adata.push(obj)
		},
		commit: function(objP) {
			var that = this.that;
			if (objP == null) {
				this.commitAddAll();
				this.commitUpdateAll();
				this.commitDeleteAll()
			} else {
				var history = objP.history,
					DM = that.options.dataModel,
					updateList = [],
					recIndx = DM.recIndx,
					objType = objP.type,
					rows = objP.rows;
				history = history == null ? false : history;
				if (objType == "add") {
					if (rows) {
						updateList = this.commitAdd(rows, recIndx)
					} else {
						this.commitAddAll()
					}
				} else if (objType == "update") {
					if (rows) {
						this.commitUpdate(rows, recIndx)
					} else {
						this.commitUpdateAll()
					}
				} else if (objType == "delete") {
					if (rows) {
						this.commitDelete(rows, recIndx)
					} else {
						this.commitDeleteAll()
					}
				}
				if (updateList.length) {
					that._digestData({
						source: "commit",
						checkEditable: false,
						track: false,
						history: history,
						updateList: updateList
					});
					that.refreshView({
						header: false
					})
				}
			}
		},
		commitAdd: function(rows, recIndx) {
			var that = this.that,
				i, j, k, rowData, row, CM = that.colModel,
				CMLength = CM.length,
				adata = this.adata,
				inArray = $.inArray,
				adataLen = adata.length,
				getVal = that.getValueFromDataType,
				updateList = [],
				rowLen = rows.length,
				_found, foundRowData = [];
			for (j = 0; j < rowLen; j++) {
				row = rows[j];
				for (i = 0; i < adataLen; i++) {
					rowData = adata[i].rowData;
					_found = true;
					if (inArray(rowData, foundRowData) == -1) {
						for (k = 0; k < CMLength; k++) {
							var column = CM[k],
								dataType = column.dataType,
								dataIndx = column.dataIndx;
							if (column.hidden || dataIndx == recIndx) {
								continue
							}
							var cellData = rowData[dataIndx],
								cellData = getVal(cellData, dataType),
								cell = row[dataIndx],
								cell = getVal(cell, dataType);
							if (cellData !== cell) {
								_found = false;
								break
							}
						}
						if (_found) {
							var newRow = {},
								oldRow = {};
							newRow[recIndx] = row[recIndx];
							oldRow[recIndx] = rowData[recIndx];
							updateList.push({
								rowData: rowData,
								oldRow: oldRow,
								newRow: newRow
							});
							foundRowData.push(rowData);
							break
						}
					}
				}
			}
			var remain_adata = [];
			for (i = 0; i < adataLen; i++) {
				rowData = adata[i].rowData;
				if (inArray(rowData, foundRowData) == -1) {
					remain_adata.push(adata[i])
				}
			}
			this.adata = remain_adata;
			return updateList
		},
		commitDelete: function(rows, recIndx) {
			var ddata = this.ddata,
				i = ddata.length,
				udata = this.udata,
				rowData, recId, j, k;
			while (i--) {
				rowData = ddata[i].rowData;
				recId = rowData[recIndx];
				j = rows.length;
				if (!j) {
					break
				}
				while (j--) {
					if (recId == rows[j][recIndx]) {
						rows.splice(j, 1);
						ddata.splice(i, 1);
						k = udata.length;
						while (k--) {
							if (udata[k].rowData == rowData) {
								udata.splice(k, 1)
							}
						}
						break
					}
				}
			}
		},
		commitUpdate: function(rows, recIndx) {
			var that = this.that,
				i, j, dirtyClass = this.options.trackModel.dirtyClass,
				udata = this.udata,
				udataLen = udata.length,
				rowLen = rows.length,
				foundRowData = [];
			for (i = 0; i < udataLen; i++) {
				var rec = udata[i],
					rowData = rec.rowData,
					oldRow = rec.oldRow;
				if ($.inArray(rowData, foundRowData) != -1) {
					continue
				}
				for (j = 0; j < rowLen; j++) {
					var row = rows[j];
					if (rowData[recIndx] == row[recIndx]) {
						foundRowData.push(rowData);
						for (var dataIndx in oldRow) {
							that.removeClass({
								rowData: rowData,
								dataIndx: dataIndx,
								cls: dirtyClass
							})
						}
					}
				}
			}
			var newudata = [];
			for (i = 0; i < udataLen; i++) {
				rowData = udata[i].rowData;
				if ($.inArray(rowData, foundRowData) == -1) {
					newudata.push(udata[i])
				}
			}
			this.udata = newudata
		},
		commitAddAll: function() {
			this.adata = []
		},
		commitDeleteAll: function() {
			var ddata = this.ddata,
				udata = this.udata,
				j = udata.length,
				rowData, ddataLen = ddata.length;
			for (var i = 0; j > 0 && i < ddataLen; i++) {
				rowData = ddata[i].rowData;
				while (j--) {
					if (udata[j].rowData == rowData) {
						udata.splice(j, 1)
					}
				}
				j = udata.length
			}
			ddata.length = 0
		},
		commitUpdateAll: function() {
			var that = this.that,
				dirtyClass = this.options.trackModel.dirtyClass,
				udata = this.udata;
			for (var i = 0, len = udata.length; i < len; i++) {
				var rec = udata[i],
					row = rec.oldRow,
					rowData = rec.rowData;
				for (var dataIndx in row) {
					that.removeClass({
						rowData: rowData,
						dataIndx: dataIndx,
						cls: dirtyClass
					})
				}
			}
			this.udata = []
		},
		"delete": function(obj) {
			var that = this.that,
				rowIndx = obj.rowIndx,
				rowIndxPage = obj.rowIndxPage,
				offset = that.riOffset,
				rowIndx = rowIndx == null ? rowIndxPage + offset : rowIndx,
				rowIndxPage = rowIndxPage == null ? rowIndx - offset : rowIndxPage,
				paging = that.options.pageModel.type,
				indx = paging == "remote" ? rowIndxPage : rowIndx,
				adata = this.adata,
				ddata = this.ddata,
				rowData = that.getRowData(obj);
			for (var i = 0, len = adata.length; i < len; i++) {
				if (adata[i].rowData == rowData) {
					adata.splice(i, 1);
					return
				}
			}
			ddata.push({
				indx: indx,
				rowData: rowData,
				rowIndx: rowIndx
			})
		},
		getChangesValue: function(ui) {
			ui = ui || {};
			var that = this.that,
				all = ui.all,
				udata = this.udata,
				adata = this.adata,
				ddata = this.ddata,
				mupdateList = [],
				updateList = [],
				oldList = [],
				addList = [],
				mdeleteList = [],
				deleteList = [];
			for (var i = 0, len = ddata.length; i < len; i++) {
				var rec = ddata[i],
					rowData = rec.rowData,
					row = {};
				mdeleteList.push(rowData);
				for (var key in rowData) {
					if (key.indexOf("pq_") != 0) {
						row[key] = rowData[key]
					}
				}
				deleteList.push(row)
			}
			for (var i = 0, len = udata.length; i < len; i++) {
				var rec = udata[i],
					oldRow = rec.oldRow,
					rowData = rec.rowData;
				if ($.inArray(rowData, mdeleteList) != -1) {
					continue
				}
				if ($.inArray(rowData, mupdateList) == -1) {
					var row = {};
					if (all !== false) {
						for (var key in rowData) {
							if (key.indexOf("pq_") != 0) {
								row[key] = rowData[key]
							}
						}
					} else {
						for (var key in oldRow) {
							row[key] = rowData[key]
						}
						row[that.options.dataModel.recIndx] = rec.recId
					}
					mupdateList.push(rowData);
					updateList.push(row);
					oldList.push(oldRow)
				}
			}
			for (var i = 0, len = adata.length; i < len; i++) {
				var rec = adata[i],
					rowData = rec.rowData,
					row = {};
				for (var key in rowData) {
					if (key.indexOf("pq_") != 0) {
						row[key] = rowData[key]
					}
				}
				addList.push(row)
			}
			return {
				updateList: updateList,
				addList: addList,
				deleteList: deleteList,
				oldList: oldList
			}
		},
		getChanges: function() {
			var that = this.that,
				udata = this.udata,
				adata = this.adata,
				ddata = this.ddata,
				inArray = $.inArray,
				updateList = [],
				oldList = [],
				addList = [],
				deleteList = [];
			for (var i = 0, len = ddata.length; i < len; i++) {
				var rec = ddata[i],
					rowData = rec.rowData;
				deleteList.push(rowData)
			}
			for (var i = 0, len = udata.length; i < len; i++) {
				var rec = udata[i],
					oldRow = rec.oldRow,
					rowData = rec.rowData;
				if (inArray(rowData, deleteList) != -1) {
					continue
				}
				if (inArray(rowData, updateList) == -1) {
					updateList.push(rowData);
					oldList.push(oldRow)
				}
			}
			for (var i = 0, len = adata.length; i < len; i++) {
				var rec = adata[i],
					rowData = rec.rowData;
				addList.push(rowData)
			}
			return {
				updateList: updateList,
				addList: addList,
				deleteList: deleteList,
				oldList: oldList
			}
		},
		getChangesRaw: function() {
			var that = this.that,
				udata = this.udata,
				adata = this.adata,
				ddata = this.ddata,
				mydata = {
					updateList: [],
					addList: [],
					deleteList: []
				};
			mydata["updateList"] = udata;
			mydata["addList"] = adata;
			mydata["deleteList"] = ddata;
			return mydata
		},
		isDirty: function(ui) {
			var that = this.that,
				udata = this.udata,
				adata = this.adata,
				ddata = this.ddata,
				dirty = false,
				rowData = that.getRowData(ui);
			if (rowData) {
				for (var i = 0; i < udata.length; i++) {
					var rec = udata[i];
					if (rowData == rec.rowData) {
						dirty = true;
						break
					}
				}
			} else if (udata.length || adata.length || ddata.length) {
				dirty = true
			}
			return dirty
		},
		onDA: function(self) {
			return function(evt, ui) {
				if (ui.source != "filter") {
					self.udata = [];
					self.ddata = [];
					self.adata = []
				}
			}
		},
		rollbackAdd: function(PM, data) {
			var adata = this.adata,
				rowList = [],
				paging = PM.type;
			for (var i = 0, len = adata.length; i < len; i++) {
				var rec = adata[i],
					rowData = rec.rowData;
				rowList.push({
					type: "delete",
					rowData: rowData
				})
			}
			this.adata = [];
			return rowList
		},
		rollbackDelete: function(PM, data) {
			var ddata = this.ddata,
				rowList = [],
				paging = PM.type;
			for (var i = ddata.length - 1; i >= 0; i--) {
				var rec = ddata[i],
					indx = rec.indx,
					rowIndx = rec.rowIndx,
					rowData = rec.rowData;
				rowList.push({
					type: "add",
					rowIndx: rowIndx,
					newRow: rowData
				})
			}
			this.ddata = [];
			return rowList
		},
		rollbackUpdate: function(PM, data) {
			var that = this.that,
				dirtyClass = this.options.trackModel.dirtyClass,
				udata = this.udata,
				rowList = [];
			for (var i = 0, len = udata.length; i < len; i++) {
				var rec = udata[i],
					recId = rec.recId,
					rowData = rec.rowData,
					oldRow = {},
					newRow = rec.oldRow;
				if (recId == null) {
					continue
				}
				var dataIndxs = [];
				for (var dataIndx in newRow) {
					oldRow[dataIndx] = rowData[dataIndx];
					dataIndxs.push(dataIndx)
				}
				that.removeClass({
					rowData: rowData,
					dataIndx: dataIndxs,
					cls: dirtyClass,
					refresh: false
				});
				rowList.push({
					type: "update",
					rowData: rowData,
					newRow: newRow,
					oldRow: oldRow
				})
			}
			this.udata = [];
			return rowList
		},
		rollback: function(objP) {
			var that = this.that,
				DM = that.options.dataModel,
				PM = that.options.pageModel,
				refreshView = objP && objP.refresh != null ? objP.refresh : true,
				objType = objP && objP.type != null ? objP.type : null,
				rowListAdd = [],
				rowListUpdate = [],
				rowListDelete = [],
				data = DM.data;
			if (objType == null || objType == "update") {
				rowListUpdate = this.rollbackUpdate(PM, data)
			}
			if (objType == null || objType == "delete") {
				rowListAdd = this.rollbackDelete(PM, data)
			}
			if (objType == null || objType == "add") {
				rowListDelete = this.rollbackAdd(PM, data)
			}
			that._digestData({
				history: false,
				allowInvalid: true,
				checkEditable: false,
				source: "rollback",
				track: false,
				addList: rowListAdd,
				updateList: rowListUpdate,
				deleteList: rowListDelete
			});
			if (refreshView) {
				that.refreshView({
					header: false
				})
			}
		},
		update: function(objP) {
			var that = this.that,
				TM = this.options.trackModel,
				dirtyClass = TM.dirtyClass,
				rowData = objP.rowData || that.getRowData(objP),
				recId = that.getRecId({
					rowData: rowData
				}),
				dataIndx = objP.dataIndx,
				refresh = objP.refresh,
				columns = that.columns,
				getVal = that.getValueFromDataType,
				newRow = objP.row,
				udata = this.udata,
				newudata = udata.slice(0),
				_found = false;
			if (recId == null) {
				return
			}
			for (var i = 0, len = udata.length; i < len; i++) {
				var rec = udata[i],
					oldRow = rec.oldRow;
				if (rec.rowData == rowData) {
					_found = true;
					for (var dataIndx in newRow) {
						var column = columns[dataIndx],
							dataType = column.dataType,
							newVal = newRow[dataIndx],
							newVal = getVal(newVal, dataType),
							oldVal = oldRow[dataIndx],
							oldVal = getVal(oldVal, dataType);
						if (oldRow.hasOwnProperty(dataIndx) && oldVal === newVal) {
							var obj = {
								rowData: rowData,
								dataIndx: dataIndx,
								refresh: refresh,
								cls: dirtyClass
							};
							that.removeClass(obj);
							delete oldRow[dataIndx]
						} else {
							var obj = {
								rowData: rowData,
								dataIndx: dataIndx,
								refresh: refresh,
								cls: dirtyClass
							};
							that.addClass(obj);
							if (!oldRow.hasOwnProperty(dataIndx)) {
								oldRow[dataIndx] = rowData[dataIndx]
							}
						}
					}
					if ($.isEmptyObject(oldRow)) {
						newudata.splice(i, 1)
					}
					break
				}
			}
			if (!_found) {
				var oldRow = {};
				for (var dataIndx in newRow) {
					oldRow[dataIndx] = rowData[dataIndx];
					var obj = {
						rowData: rowData,
						dataIndx: dataIndx,
						refresh: refresh,
						cls: dirtyClass
					};
					that.addClass(obj)
				}
				var obj = {
					rowData: rowData,
					recId: recId,
					oldRow: oldRow
				};
				newudata.push(obj)
			}
			this.udata = newudata
		}
	};
	fnGrid.getChanges = function(obj) {
		this.blurEditor({
			force: true
		});
		if (obj) {
			var format = obj.format;
			if (format) {
				if (format == "byVal") {
					return this.iUCData.getChangesValue(obj)
				} else if (format == "raw") {
					return this.iUCData.getChangesRaw()
				}
			}
		}
		return this.iUCData.getChanges()
	};
	fnGrid.rollback = function(obj) {
		this.blurEditor({
			force: true
		});
		this.iUCData.rollback(obj)
	};
	fnGrid.isDirty = function(ui) {
		return this.iUCData.isDirty(ui)
	};
	fnGrid.commit = function(obj) {
		this.iUCData.commit(obj)
	};
	fnGrid.updateRow = function(ui) {
		var that = this,
			len, rowList = ui.rowList || [{
				rowIndx: ui.rowIndx,
				newRow: ui.newRow || ui.row,
				rowData: ui.rowData,
				rowIndxPage: ui.rowIndxPage
			}],
			rowListNew = [];
		that.normalizeList(rowList).forEach(function(rlObj) {
			var newRow = rlObj.newRow,
				rowData = rlObj.rowData,
				dataIndx, oldRow = rlObj.oldRow = {};
			if (rowData) {
				for (dataIndx in newRow) {
					oldRow[dataIndx] = rowData[dataIndx]
				}
				rowListNew.push(rlObj)
			}
		});
		if (rowListNew.length) {
			var uid = {
					source: ui.source || "update",
					history: ui.history,
					checkEditable: ui.checkEditable,
					track: ui.track,
					allowInvalid: ui.allowInvalid,
					updateList: rowListNew
				},
				rowListEntry, keys, ri, ret = that._digestData(uid);
			if (ret === false) {
				return false
			}
			if (ui.refresh !== false) {
				rowListNew = uid.updateList;
				len = rowListNew.length;
				if (len > 1) {
					that.refresh({
						header: false
					})
				} else if (len == 1) {
					rowListEntry = rowListNew[0];
					keys = Object.keys(rowListEntry.newRow);
					ri = rowListEntry.rowIndx;
					if (keys.length <= 3) keys.forEach(function(key) {
						that.refreshCell({
							rowIndx: ri,
							dataIndx: key
						})
					});
					else that.refreshRow({
						rowIndx: ri
					})
				}
			}
		}
	};
	fnGrid.getRecId = function(obj) {
		var that = this,
			DM = that.options.dataModel;
		obj.dataIndx = DM.recIndx;
		var recId = that.getCellData(obj);
		if (recId == null) {
			return null
		} else {
			return recId
		}
	};
	fnGrid.getCellData = function(obj) {
		var rowData = obj.rowData || this.getRowData(obj),
			dataIndx = obj.dataIndx;
		if (rowData) {
			return rowData[dataIndx]
		} else {
			return null
		}
	};
	fnGrid.getRowData = function(obj) {
		if (!obj) {
			return null
		}
		var objRowData = obj.rowData,
			recId;
		if (objRowData != null) {
			return objRowData
		}
		recId = obj.recId;
		if (recId == null) {
			var rowIndx = obj.rowIndx,
				rowIndx = rowIndx != null ? rowIndx : obj.rowIndxPage + this.riOffset,
				data = this.get_p_data(),
				rowData = data[rowIndx];
			return rowData
		} else {
			var options = this.options,
				DM = options.dataModel,
				recIndx = DM.recIndx,
				DMdata = DM.data;
			for (var i = 0, len = DMdata.length; i < len; i++) {
				var rowData = DMdata[i];
				if (rowData[recIndx] == recId) {
					return rowData
				}
			}
		}
		return null
	};
	fnGrid.addNodes = function(nodes, ri) {
		ri = ri == null ? this.options.dataModel.data.length : ri;
		this._digestData({
			addList: nodes.map(function(rd) {
				return {
					rowIndx: ri++,
					newRow: rd
				}
			}),
			source: "addNodes"
		});
		this.refreshView()
	};
	fnGrid.deleteNodes = function(nodes) {
		this._digestData({
			deleteList: nodes.map(function(rd) {
				return {
					rowData: rd
				}
			}),
			source: "deleteNodes"
		});
		this.refreshView()
	};
	fnGrid.moveNodes = function(nodes, ri) {
		var self = this,
			o = self.options,
			riOffset = self.riOffset,
			data = o.dataModel.data;
		ri = ri == null ? data.length : ri;
		self._trigger("beforeMoveNode");
		nodes.forEach(function(node) {
			ri = pq.moveItem(node, data, data.indexOf(node), ri)
		});
		if (data != self.pdata) {
			self.pdata = data.slice(riOffset, o.pageModel.rPP + riOffset)
		}
		self.iRefresh.addRowIndx();
		self.iMerge.init();
		self._trigger("moveNode", null, {
			args: arguments
		});
		self.refresh()
	};
	fnGrid.deleteRow = function(ui) {
		var that = this,
			rowListNew = that.normalizeList(ui.rowList || [{
				rowIndx: ui.rowIndx,
				rowIndxPage: ui.rowIndxPage,
				rowData: ui.rowData
			}]);
		if (!rowListNew.length) {
			return false
		}
		this._digestData({
			source: ui.source || "delete",
			history: ui.history,
			track: ui.track,
			deleteList: rowListNew
		});
		if (ui.refresh !== false) {
			that.refreshView({
				header: false
			})
		}
	};
	fnGrid.addRow = function(ui) {
		var that = this,
			rowIndx, addList, offset = that.riOffset,
			DM = that.options.dataModel,
			data = DM.data = DM.data || [];
		ui.rowData && (ui.newRow = ui.rowData);
		ui.rowIndxPage != null && (ui.rowIndx = ui.rowIndxPage + offset);
		addList = ui.rowList || [{
			rowIndx: ui.rowIndx,
			newRow: ui.newRow
		}];
		if (!addList.length || this._digestData({
				source: ui.source || "add",
				history: ui.history,
				track: ui.track,
				checkEditable: ui.checkEditable,
				addList: addList
			}) === false) {
			return false
		}
		if (ui.refresh !== false) {
			this.refreshView({
				header: false
			})
		}
		rowIndx = addList[0].rowIndx;
		return rowIndx == null ? data.length - 1 : rowIndx
	}
})(jQuery);
(function() {
	window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(fn) {
		return setTimeout(fn, 10)
	};
	window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || function(id) {
		clearTimeout(id)
	}
})();
(function($) {
	var _pq = $.paramquery;

	function cMouseSelection(that) {
		var self = this;
		self.that = that;
		that.on("mousePQUp", self.onMousePQUp.bind(self)).on("cellClick", self.onCellClick.bind(self)).on("cellMouseDown", self.onCellMouseDown.bind(self)).on("cellMouseEnter", self.onCellMouseEnter.bind(self)).on("refresh refreshRow", self.onRefresh.bind(self))
	}
	_pq.cMouseSelection = cMouseSelection;
	cMouseSelection.prototype = $.extend({
		onCellMouseDown: function(evt, ui) {
			if (evt.isDefaultPrevented()) {
				return
			}
			var that = this.that,
				rowIndx = ui.rowIndx,
				iSel = that.iSelection,
				colIndx = ui.colIndx,
				SM = that.options.selectionModel,
				type = SM.type,
				mode = SM.mode,
				last = iSel.addressLast();
			if (type == "cell") {
				if (colIndx == null) {
					return
				}
				if (colIndx == -1) {
					if (!SM.row) {
						return
					}
					colIndx = undefined
				}
				if (evt.shiftKey && mode !== "single" && last) {
					var r1 = last.firstR,
						c1 = last.firstC;
					iSel.resizeOrReplace({
						r1: r1,
						c1: colIndx == null ? undefined : c1,
						r2: rowIndx,
						c2: colIndx,
						firstR: r1,
						firstC: c1
					})
				} else if (pq.isCtrl(evt) && mode !== "single") {
					this.mousedown = {
						r1: rowIndx,
						c1: colIndx
					};
					if (colIndx == null) iSel.add({
						r1: rowIndx,
						firstR: rowIndx,
						firstC: that.getFirstVisibleCI()
					});
					else iSel.add({
						r1: rowIndx,
						c1: colIndx,
						firstR: rowIndx,
						firstC: colIndx
					})
				} else {
					this.mousedown = {
						r1: rowIndx,
						c1: colIndx
					};
					iSel.clearOther({
						r1: rowIndx,
						c1: colIndx
					}, true);
					if (colIndx == null) {
						iSel.resizeOrReplace({
							r1: rowIndx,
							firstR: rowIndx,
							firstC: that.getFirstVisibleCI()
						})
					} else {
						iSel.resizeOrReplace({
							r1: rowIndx,
							c1: colIndx,
							firstR: rowIndx,
							firstC: colIndx
						})
					}
				}
			}
			that[ui.colIndx == -1 ? "focusT" : "focus"](ui)
		},
		onCellMouseEnter: function(evt, ui) {
			var that = this.that,
				SM = that.options.selectionModel,
				type = SM.type,
				mousedown = this.mousedown,
				mode = SM.mode;
			if (mousedown && mode !== "single") {
				if (type === "cell") {
					var r1 = mousedown.r1,
						c1 = mousedown.c1,
						r2 = ui.rowIndx,
						c2 = ui.colIndx,
						iSel = that.Selection();
					that.scrollCell({
						rowIndx: r2,
						colIndx: c2
					});
					iSel.resizeOrReplace({
						r1: r1,
						c1: c1,
						r2: r2,
						c2: c2
					})
				}
				that.focusT(ui)
			}
		},
		onCellClick: function(evt, ui) {
			var that = this.that,
				SM = that.options.selectionModel,
				single = SM.mode == "single",
				toggle = SM.toggle,
				isSelected, iRows = that.iRows;
			if (SM.type == "row") {
				if (!SM.row && ui.colIndx == -1) {
					return
				}
				isSelected = iRows.isSelected(ui);
				if ((!single || isSelected) && !toggle && pq.isCtrl(evt)) {
					ui.isFirst = true;
					iRows.toggle(ui)
				} else if (!single && evt.shiftKey) {
					iRows.extend(ui)
				} else if (single && (!isSelected || !toggle)) {
					if (!isSelected) {
						iRows.replace(ui)
					}
				} else {
					ui.isFirst = true;
					iRows[toggle ? "toggle" : "replace"](ui)
				}
			}
		},
		onMousePQUp: function() {
			this.mousedown = null
		},
		onRefresh: function() {
			var that = this.that;
			this.setTimer(function() {
				if (that.element) {
					that.focus()
				}
			}, 300)
		}
	}, new _pq.cClass)
})(jQuery);
(function($) {
	var iExcel = null,
		pasteProgress = false,
		id_clip = "pq-grid-excel",
		_pq = $.paramquery,
		_pgrid = _pq.pqGrid.prototype;
	$.extend(_pgrid.options, {
		copyModel: {
			on: true,
			render: false,
			zIndex: 1e4
		},
		cutModel: {
			on: true
		},
		pasteModel: {
			on: true,
			compare: "byVal",
			select: true,
			validate: true,
			allowInvalid: true,
			type: "replace"
		}
	});
	$.extend(_pgrid, {
		_setGlobalStr: function(str) {
			cExcel.clip = str
		},
		canPaste: function() {
			return !!_pq.cExcel.clip
		},
		clearPaste: function() {
			_pq.cExcel.clip = ""
		},
		copy: function(ui) {
			return this.iSelection.copy(ui)
		},
		cut: function(ui) {
			return this.iSelection.cut(ui)
		},
		paste: function(ui) {
			iExcel = new cExcel(this);
			iExcel.paste(ui);
			iExcel = null
		},
		clear: function() {
			var iSel = this.iSelection;
			if (iSel.address().length) {
				iSel.clear()
			} else {
				this.iRows.toRange().clear()
			}
		}
	});
	var cExcel = _pq.cExcel = function(that) {
		this.that = that
	};
	cExcel.clip = "";
	cExcel.prototype = {
		createClipBoard: function() {
			var that = this.that,
				$div = $("#pq-grid-excel-div"),
				CPM = that.options.copyModel,
				$text = $("#" + id_clip);
			if ($text.length == 0) {
				$div = $("<div id='pq-grid-excel-div' " + " style='position:fixed;top:20px;left:20px;height:1px;width:1px;overflow:hidden;z-index:" + CPM.zIndex + ";'/>").appendTo(document.body);
				$text = $("<textarea id='" + id_clip + "' autocomplete='off' spellcheck='false'" + " style='overflow:hidden;height:10000px;width:10000px;opacity:0' />").appendTo($div);
				$text.css({
					opacity: 0
				}).on("keyup", function(evt) {
					if (pq.isCtrl(evt) && that.element) {
						that._trigger("keyUp", evt)
					}
				})
			}
			$text.on("focusin", function(evt) {
				evt.stopPropagation()
			});
			$text.select()
		},
		destroyClipBoard: function() {
			this.clearClipBoard();
			var that = this.that,
				pageTop = $(window).scrollTop(),
				pageLeft = $(window).scrollLeft();
			that.focus();
			var pageTop2 = $(window).scrollTop(),
				pageLeft2 = $(window).scrollLeft();
			if (pageTop != pageTop2 || pageLeft != pageLeft2) {
				window.scrollTo(pageLeft, pageTop)
			}
		},
		clearClipBoard: function() {
			var $text = $("#" + id_clip);
			$text.val("")
		},
		copy: function(ui) {
			var that = this.that,
				iSel = that.iSelection;
			if (iSel.address().length) {
				return iSel.copy(ui)
			} else {
				that.iRows.toRange().copy(ui)
			}
		},
		getRows: function(text) {
			text = text.replace(/\n$/, "");
			text = text.replace(/(^|\t|\n)"(?=[^\t]*?[\r\n])([^"]|"")*"(?=$|\t|\n)/g, function(a) {
				return a.replace(/(?!^(\r\n|\n))(\r\n|\n)/g, "\r").replace(/^(\t|\n)?"/, "$1").replace(/"$/, "").replace(/""/g, '"')
			});
			return text.split("\n")
		},
		paste: function(ui) {
			ui = ui || {};
			var that = this.that,
				dest = ui.dest,
				clip = ui.clip,
				text = ui.text || (clip ? clip.length ? clip.val() : "" : cExcel.clip);
			var rows = this.getRows(text),
				rows_length = rows.length,
				CM = that.colModel,
				o = that.options,
				readCell = that.readCell,
				PSTM = o.pasteModel,
				SMType = "row",
				refreshView = false,
				CMLength = CM.length;
			if (!PSTM.on) {
				return
			}
			if (text.length == 0 || rows_length == 0) {
				return
			}
			for (var i = 0; i < rows_length; i++) {
				rows[i] = rows[i].split("	")
			}
			var PMtype = PSTM.type,
				selRowIndx, selColIndx, selEndRowIndx, selEndColIndx, iSel = dest ? that.Range(dest) : that.Selection(),
				_areas = iSel.address(),
				areas = _areas.length ? _areas : that.iRows.toRange().address(),
				area = areas[0],
				tui = {
					rows: rows,
					areas: [area]
				};
			if (that._trigger("beforePaste", null, tui) === false) {
				return false
			}
			if (area && that.getRowData({
					rowIndx: area.r1
				})) {
				SMType = area.type == "row" ? "row" : "cell";
				selRowIndx = area.r1;
				selEndRowIndx = area.r2;
				selColIndx = area.c1;
				selEndColIndx = area.c2
			} else {
				SMType = "cell";
				selRowIndx = 0;
				selEndRowIndx = 0;
				selColIndx = 0;
				selEndColIndx = 0
			}
			var selRowIndx2, modeV;
			if (PMtype == "replace") {
				selRowIndx2 = selRowIndx;
				modeV = selEndRowIndx - selRowIndx + 1 < rows_length ? "extend" : "repeat"
			} else if (PMtype == "append") {
				selRowIndx2 = selEndRowIndx + 1;
				modeV = "extend"
			} else if (PMtype == "prepend") {
				selRowIndx2 = selRowIndx;
				modeV = "extend"
			}
			var modeH, lenV = modeV == "extend" ? rows_length : selEndRowIndx - selRowIndx + 1,
				lenH, lenHCopy;
			var ii = 0,
				skippedR = 0,
				addList = [],
				updateList = [],
				rowsAffected = 0;
			for (i = 0; i < lenV; i++) {
				var row = rows[ii],
					rowIndx = i + selRowIndx2,
					rowData = PMtype == "replace" ? that.getRowData({
						rowIndx: rowIndx
					}) : null,
					oldRow = rowData ? {} : null,
					newRow = {};
				if (row === undefined && modeV === "repeat") {
					ii = 0;
					row = rows[ii]
				}
				if (rowData && rowData.pq_paste === false) {
					lenV++;
					skippedR++;
					continue
				}
				ii++;
				var cells = row,
					cellsLength = cells.length;
				if (!lenH) {
					if (SMType == "cell") {
						modeH = selEndColIndx - selColIndx + 1 < cellsLength ? "extend" : "repeat";
						lenH = modeH == "extend" ? cellsLength : selEndColIndx - selColIndx + 1;
						if (isNaN(lenH)) {
							throw "lenH NaN. assert failed."
						}
						if (lenH + selColIndx > CMLength) {
							lenH = CMLength - selColIndx
						}
					} else {
						lenH = CMLength;
						selColIndx = 0
					}
				}
				var jj = 0,
					j = 0,
					skippedC = 0;
				lenHCopy = lenH;
				for (j = 0; j < lenHCopy; j++) {
					if (jj >= cellsLength) {
						jj = 0
					}
					var colIndx = j + selColIndx,
						column = CM[colIndx],
						cell = cells[jj],
						dataIndx = column.dataIndx;
					if (column.paste === false) {
						skippedC++;
						if (modeH == "extend") {
							if (lenHCopy + selColIndx < CMLength) {
								lenHCopy++
							}
						}
						continue
					} else {
						jj++;
						newRow[dataIndx] = cell;
						if (oldRow) {
							oldRow[dataIndx] = readCell(rowData, column)
						}
					}
				}
				if ($.isEmptyObject(newRow) == false) {
					if (rowData == null) {
						refreshView = true;
						addList.push({
							newRow: newRow,
							rowIndx: rowIndx
						})
					} else {
						updateList.push({
							newRow: newRow,
							rowIndx: rowIndx,
							rowData: rowData,
							oldRow: oldRow
						})
					}
					rowsAffected++
				}
			}
			var dui = {
				addList: addList,
				updateList: updateList,
				source: "paste",
				allowInvalid: PSTM.allowInvalid,
				validate: PSTM.validate
			};
			that._digestData(dui);
			that[refreshView ? "refreshView" : "refresh"]({
				header: false
			});
			if (PSTM.select) {
				that.Range({
					r1: selRowIndx2,
					c1: selColIndx,
					r2: selRowIndx2 + rowsAffected - 1 + skippedR,
					c2: modeH == "extend" ? selColIndx + lenH - 1 + skippedC : selEndColIndx
				}).select()
			}
			that._trigger("paste", null, tui)
		}
	};
	$(document).unbind(".pqExcel").bind("keydown.pqExcel", function(evt) {
		if (pq.isCtrl(evt)) {
			var $ae = $(evt.target);
			if (!$ae.hasClass("pq-grid-cell") && !$ae.is("#" + id_clip) && !$ae.hasClass("pq-body-outer")) {
				return
			}
			var $grid = $ae.closest(".pq-grid"),
				that;
			if (iExcel || $ae.length && $grid.length) {
				if (!iExcel) {
					try {
						that = $grid.pqGrid("instance");
						if (that.options.selectionModel.native) {
							return true
						}
					} catch (ex) {
						return true
					}
					iExcel = new cExcel(that, $ae);
					iExcel.createClipBoard()
				}
				if (evt.keyCode == "67" || evt.keyCode == "99") {
					iExcel.copy({
						clip: $("#" + id_clip)
					})
				} else if (evt.keyCode == "88") {
					iExcel.copy({
						cut: true,
						clip: $("#" + id_clip)
					})
				} else if (evt.keyCode == "86" || evt.keyCode == "118") {
					pasteProgress = true;
					iExcel.clearClipBoard();
					window.setTimeout(function() {
						if (iExcel) {
							iExcel.paste({
								clip: $("#" + id_clip)
							});
							iExcel.destroyClipBoard();
							iExcel = null
						}
						pasteProgress = false
					}, 3)
				} else {
					var $text = $("#" + id_clip);
					if ($text.length) {
						var ae = document.activeElement;
						if (ae == $text[0]) {
							iExcel.that.onKeyPressDown(evt)
						}
					}
				}
			} else {}
		} else {
			var kc = evt.keyCode,
				KC = $.ui.keyCode,
				navKey = kc == KC.UP || kc == KC.DOWN || kc == KC.LEFT || kc == KC.RIGHT || kc == KC.PAGE_UP || kc == KC.PAGE_DOWN;
			if (navKey) {
				if (keyDownInGrid) {
					return false
				}
				$ae = $(evt.target);
				if ($ae.hasClass("pq-grid-row") || $ae.hasClass("pq-grid-cell")) {
					keyDownInGrid = true
				}
			}
		}
	}).bind("keyup.pqExcel", function(evt) {
		var keyCode = evt.keyCode;
		if (!pasteProgress && iExcel && !pq.isCtrl(evt) && $.inArray(keyCode, [17, 91, 93, 224]) != -1) {
			iExcel.destroyClipBoard();
			iExcel = null
		}
		if (keyDownInGrid) {
			var $ae = $(evt.target);
			if (!$ae.hasClass("pq-grid-row") && !$ae.hasClass("pq-grid-cell")) {
				keyDownInGrid = false
			}
		}
	});
	var keyDownInGrid = false
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		pq_options = _pq.pqGrid.prototype.options,
		historyModel = {
			on: true,
			checkEditable: true,
			checkEditableAdd: false,
			allowInvalid: true
		};
	pq_options.historyModel = pq_options.historyModel || historyModel;
	var cHistory = _pq.cHistory = function(that) {
		var self = this;
		self.that = that;
		self.options = that.options;
		self.records = [];
		self.counter = 0;
		self.id = 0;
		that.on("keyDown", self.onKeyDown.bind(self)).on("dataAvailable", function(evt, ui) {
			if (ui.source != "filter") {
				self.reset()
			}
		})
	};
	cHistory.prototype = {
		onKeyDown: function(evt, ui) {
			var keyCodes = {
					z: "90",
					y: "89",
					c: "67",
					v: "86"
				},
				ctrlMeta = pq.isCtrl(evt);
			if (ctrlMeta && evt.keyCode == keyCodes.z) {
				if (this.undo()) {}
				return false
			} else if (ctrlMeta && evt.keyCode == keyCodes.y) {
				if (this.redo()) {}
				return false
			}
		},
		resetUndo: function() {
			if (this.counter == 0) {
				return false
			}
			this.counter = 0;
			var that = this.that;
			that._trigger("history", null, {
				type: "resetUndo",
				num_undo: 0,
				num_redo: this.records.length - this.counter,
				canUndo: false,
				canRedo: true
			})
		},
		reset: function() {
			if (this.counter == 0 && this.records.length == 0) {
				return false
			}
			this.records = [];
			this.counter = 0;
			this.id = 0;
			this.that._trigger("history", null, {
				num_undo: 0,
				num_redo: 0,
				type: "reset",
				canUndo: false,
				canRedo: false
			})
		},
		increment: function() {
			var records = this.records,
				len = records.length;
			if (len) {
				var id = records[len - 1].id;
				this.id = id + 1
			} else {
				this.id = 0
			}
		},
		push: function(objP) {
			var prevCanRedo = this.canRedo();
			var records = this.records,
				counter = this.counter;
			if (records.length > counter) {
				records.splice(counter, records.length - counter)
			}
			records[counter] = $.extend({
				id: this.id
			}, objP);
			this.counter++;
			var that = this.that,
				canUndo, canRedo;
			if (this.counter == 1) {
				canUndo = true
			}
			if (prevCanRedo && this.counter == records.length) {
				canRedo = false
			}
			that._trigger("history", null, {
				type: "add",
				canUndo: canUndo,
				canRedo: canRedo,
				num_undo: this.counter,
				num_redo: 0
			})
		},
		canUndo: function() {
			if (this.counter > 0) return true;
			else return false
		},
		canRedo: function() {
			return this.counter < this.records.length
		},
		undo: function() {
			var prevCanRedo = this.canRedo(),
				that = this.that,
				HM = this.options.historyModel,
				records = this.records;
			if (this.counter > 0) {
				this.counter--
			} else {
				return false
			}
			var counter = this.counter,
				record = records[counter],
				callback = record.callback,
				canRedo, canUndo, id = record.id,
				updateList, addList, deleteList;
			if (callback) callback();
			else {
				updateList = record.updateList.map(function(rowListObj) {
					return {
						rowIndx: that.getRowIndx({
							rowData: rowListObj.rowData
						}).rowIndx,
						rowData: rowListObj.rowData,
						oldRow: rowListObj.newRow,
						newRow: rowListObj.oldRow
					}
				}), deleteList = record.addList.map(function(rowListObj) {
					return {
						rowData: rowListObj.newRow
					}
				}), addList = record.deleteList.map(function(rowListObj) {
					return {
						newRow: rowListObj.rowData,
						rowIndx: rowListObj.rowIndx
					}
				});
				var ret = that._digestData({
					history: false,
					source: "undo",
					checkEditable: HM.checkEditable,
					checkEditableAdd: HM.checkEditableAdd,
					allowInvalid: HM.allowInvalid,
					addList: addList,
					updateList: updateList,
					deleteList: deleteList
				});
				that[addList.length || deleteList.length ? "refreshView" : "refresh"]({
					source: "undo",
					header: false
				})
			}
			if (prevCanRedo === false) {
				canRedo = true
			}
			if (this.counter == 0) {
				canUndo = false
			}
			that._trigger("history", null, {
				canUndo: canUndo,
				canRedo: canRedo,
				type: "undo",
				num_undo: this.counter,
				num_redo: this.records.length - this.counter
			});
			return true
		},
		redo: function() {
			var prevCanUndo = this.canUndo(),
				that = this.that,
				HM = this.options.historyModel,
				counter = this.counter,
				records = this.records;
			if (counter == records.length) {
				return false
			}
			var record = records[counter],
				callback = record.callback,
				id = record.id,
				updateList, addList, deleteList;
			if (callback) callback(true);
			else {
				updateList = record.updateList.map(function(rowListObj) {
					return {
						rowIndx: that.getRowIndx({
							rowData: rowListObj.rowData
						}).rowIndx,
						rowData: rowListObj.rowData,
						newRow: rowListObj.newRow,
						oldRow: rowListObj.oldRow
					}
				}), deleteList = record.deleteList.map(function(rowListObj) {
					return {
						rowData: rowListObj.rowData
					}
				}), addList = record.addList.map(function(rowListObj) {
					return {
						newRow: rowListObj.newRow,
						rowIndx: rowListObj.rowIndx
					}
				});
				var ret = that._digestData({
					history: false,
					source: "redo",
					checkEditable: HM.checkEditable,
					checkEditableAdd: HM.checkEditableAdd,
					allowInvalid: HM.allowInvalid,
					addList: addList,
					updateList: updateList,
					deleteList: deleteList
				});
				that[addList.length || deleteList.length ? "refreshView" : "refresh"]({
					source: "redo",
					header: false
				})
			}
			if (this.counter < records.length) {
				this.counter++
			}
			var canUndo, canRedo;
			if (prevCanUndo == false) {
				canUndo = true
			}
			if (this.counter == this.records.length) {
				canRedo = false
			}
			that._trigger("history", null, {
				canUndo: canUndo,
				canRedo: canRedo,
				type: "redo",
				num_undo: this.counter,
				num_redo: this.records.length - this.counter
			});
			return true
		}
	};
	var fnGrid = _pq.pqGrid.prototype;
	fnGrid.history = function(obj) {
		var method = obj.method;
		return this.iHistory[method](obj)
	};
	fnGrid.History = function() {
		return this.iHistory
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	pq.filter = {
		dpBeforeShow: function(grid, di, i) {
			return function() {
				var gco = grid.getDataCascade(di),
					min, max;
				if (gco.length) {
					min = gco[0][di] == "" ? gco[1][di] : gco[0][di];
					max = gco[gco.length - 1][di]
				}
				$(this).datepicker("option", "defaultDate", new Date(i == 1 ? max : min))
			}
		},
		datepicker: function(ui) {
			var column = ui.column,
				di = column.dataIndx,
				grid = this,
				filterUI = ui.filterUI,
				$editor = ui.$editor,
				dt = column.dataType,
				ui2 = {
					dateFormat: filterUI.format || column.format,
					changeYear: true,
					changeMonth: true
				};
			if (dt == "date") {
				$editor.each(function(i, ele) {
					var options = $.extend({}, ui2, i == 1 ? filterUI.dpOptions2 || filterUI.dpOptions : filterUI.dpOptions);
					if (!options.defaultDate) {
						options.beforeShow = options.beforeShow || pq.filter.dpBeforeShow(grid, di, i)
					}
					$(ele).datepicker(options)
				});
				return true
			}
		},
		filterFnEq: function(ui, grid) {
			var dt = (ui.column || {}).dataType;
			if (dt == "date") {
				return this.filterFnTD(ui, grid)
			} else if (dt == "bool") {
				return {
					type: "checkbox"
				}
			} else {
				return $.extend({
					maxCheck: 1
				}, this.filterFnSelect(ui, grid))
			}
		},
		filterFnSelect: function(ui, grid) {
			var di = ui.column.dataIndx,
				indx = ui.indx;
			return {
				type: "select",
				style: "padding-" + (grid && grid.options.rtl ? "left" : "right") + ":16px;cursor:default;",
				attr: "readonly",
				valueIndx: di,
				labelIndx: di,
				options: this.options,
				init: indx == 0 ? this.rangeInit.bind(grid) : function() {}
			}
		},
		filterFnT: function() {
			return {
				type: "textbox",
				attr: "autocomplete='off'"
			}
		},
		filterFnTD: function() {
			return {
				type: "textbox",
				attr: "autocomplete='off'",
				init: pq.filter.datepicker
			}
		},
		getVal: function(filter) {
			var crule0 = (filter.crules || [])[0] || {};
			return [crule0.value, crule0.value2, crule0.condition]
		},
		setVal: function(filter, val) {
			var crules = filter.crules = filter.crules || [];
			crules[0] = crules[0] || {};
			crules[0].value = val;
			return val
		}
	};
	$.extend(pq.filter, {
		conditions: {
			begin: {
				string: 1,
				numberList: 1,
				dateList: 1,
				filterFn: pq.filter.filterFnT
			},
			between: {
				stringList: 1,
				date: 1,
				number: 1,
				filter: {
					attr: "autocomplete='off'",
					type: "textbox2",
					init: pq.filter.datepicker
				}
			},
			contain: {
				string: 1,
				numberList: 1,
				dateList: 1,
				filterFn: pq.filter.filterFnT
			},
			equal: {
				string: 1,
				bool: 1,
				date: 1,
				number: 1,
				filterFn: pq.filter.filterFnEq
			},
			empty: {
				string: 1,
				bool: 1,
				date: 1,
				number: 1,
				nr: 1
			},
			end: {
				string: 1,
				numberList: 1,
				dateList: 1,
				filterFn: pq.filter.filterFnT
			},
			great: {
				stringList: 1,
				number: 1,
				date: 1,
				filterFn: pq.filter.filterFnTD
			},
			gte: {
				stringList: 1,
				number: 1,
				date: 1,
				filterFn: pq.filter.filterFnTD
			},
			less: {
				stringList: 1,
				number: 1,
				date: 1,
				filterFn: pq.filter.filterFnTD
			},
			lte: {
				stringList: 1,
				number: 1,
				date: 1,
				filterFn: pq.filter.filterFnTD
			},
			notbegin: {
				string: 1,
				numberList: 1,
				dateList: 1,
				filterFn: pq.filter.filterFnT
			},
			notcontain: {
				string: 1,
				numberList: 1,
				dateList: 1,
				filterFn: pq.filter.filterFnT
			},
			notequal: {
				string: 1,
				date: 1,
				number: 1,
				bool: 1,
				filterFn: pq.filter.filterFnEq
			},
			notempty: {
				string: 1,
				bool: 1,
				date: 1,
				number: 1,
				nr: 1
			},
			notend: {
				string: 1,
				numberList: 1,
				dateList: 1,
				filterFn: pq.filter.filterFnT
			},
			range: {
				cascade: 1,
				string: 1,
				number: 1,
				date: 1,
				bool: 1,
				filterFn: pq.filter.filterFnSelect
			},
			regexp: {
				string: 1,
				numberList: 1,
				dateList: 1,
				filterFn: pq.filter.filterFnT
			}
		},
		getConditionsCol: function(column, filterUI) {
			var list = filterUI.conditionList || function(self) {
					var list = self.getConditionsDT(pq.getDataType(column));
					list.sort();
					return list
				}(this),
				exclude = filterUI.conditionExclude,
				obj = {};
			if (exclude) {
				exclude.forEach(function(val) {
					obj[val] = 1
				});
				list = list.filter(function(val) {
					return !obj[val]
				})
			}
			return list
		},
		getConditionsDT: function(dt) {
			var arr = [],
				key, conditions = this.conditions,
				obj, d;
			for (key in conditions) {
				obj = conditions[key];
				d = obj[dt + "List"];
				if (obj[dt] && d !== 0 || d) arr.push(key)
			}
			return arr
		},
		getFilterUI: function(ui, grid) {
			var column = ui.column,
				filterFn = column.filterFn,
				filter = (ui.indx === 0 ? column.filter : {}) || {},
				obj = this.conditions[ui.condition] || {},
				_filterFn = obj.filterFn,
				_filter = obj.filter || {};
			delete filter.type;
			filterFn = filterFn ? filterFn.call(grid, ui) || {} : {};
			_filterFn = _filterFn ? _filterFn.call(this, ui, grid) || {} : {};
			var filterUI = $.extend({}, _filter, _filterFn, filter, filterFn);
			filterUI.condition = ui.condition;
			filterUI.init = [];
			filterUI.options = [];
			[filterFn, filter, _filterFn, _filter].forEach(function(f) {
				if (f.init) filterUI.init.push(f.init);
				if (f.options) filterUI.options.push(f.options)
			});
			return filterUI
		},
		options: function(ui) {
			var col = ui.column,
				f = ui.filterUI,
				diG = f.groupIndx,
				di = col.dataIndx;
			return this.getDataCascade(di, diG, f.diExtra)
		},
		getOptions: function(col, filterUI, grid) {
			var options = filterUI.options,
				di = col.dataIndx,
				ui = {
					column: col,
					dataIndx: di,
					filterUI: filterUI,
					condition: filterUI.condition
				},
				i = 0,
				len = options.length,
				o, opt;
			for (; i < len; i++) {
				o = options[i];
				if (o) {
					opt = typeof o == "function" ? o.call(grid, ui) : o;
					if (opt) {
						opt = grid.getPlainOptions(opt, di);
						opt = grid.removeNullOptions(opt, filterUI.dataIndx || di, filterUI.groupIndx);
						return opt
					}
				}
			}
			return []
		},
		rangeInit: function(ui) {
			var grid = this,
				column = ui.column,
				$editor = ui.$editor,
				headMenu = ui.headMenu,
				filterUI = ui.filterUI;
			if (!headMenu) {
				$editor.parent().off("click keydown").on("click keydown", function(evt) {
					if (evt.type == "keydown" && evt.keyCode != $.ui.keyCode.DOWN) {
						return
					}
					var id = grid.uuid + "_" + column.dataIndx;
					if (!$("#" + id).length) {
						var i = new pq.cFilterMenu.select(grid, column),
							$div = $("<div id='" + id + "' style='width:270px;' class='pq-theme'><div></div></div>").appendTo(document.body),
							$grid = $div.children();
						pq.makePopup($div[0], $editor);
						$div.position({
							my: "left top",
							at: "left bottom",
							of: ui.$editor
						});
						i.create($grid, filterUI)
					}
				})
			}
		},
		getType: function(condition, column) {
			var obj = this.conditions[condition] || {},
				filterFn = obj.filterFn,
				_filter = obj.filter || {};
			return _filter.type || (filterFn ? filterFn.call(this, {
				condition: condition,
				column: column
			}) : {}).type
		}
	});
	var cFilterData = function(that) {
		var self = this;
		self.that = that;
		that.on("load", self.onLoad.bind(self)).on("filter clearFilter", self.onFilterChange.bind(self))
	};
	_pq.cFilterData = cFilterData;
	var cFc = cFilterData.conditions = {
		equal: function(cd, value) {
			return cd == value
		},
		notequal: function() {
			return !cFc.equal.apply(this, arguments)
		},
		contain: function(cd, value) {
			return (cd + "").indexOf(value) != -1
		},
		notcontain: function() {
			return !cFc.contain.apply(this, arguments)
		},
		empty: function(cd) {
			return cd.length == 0
		},
		notempty: function() {
			return !cFc.empty.apply(this, arguments)
		},
		begin: function(cd, value) {
			return (cd + "").indexOf(value) == 0
		},
		notbegin: function() {
			return !cFc.begin.apply(this, arguments)
		},
		end: function(cd, value) {
			cd = cd + "";
			value = value + "";
			var lastIndx = cd.lastIndexOf(value);
			if (lastIndx != -1 && lastIndx + value.length == cd.length) {
				return true
			}
		},
		notend: function() {
			return !cFc.end.apply(this, arguments)
		},
		regexp: function(cd, value) {
			if (value.test(cd)) {
				value.lastIndex = 0;
				return true
			}
		},
		great: function(cd, value) {
			return cd > value
		},
		gte: function(cd, value) {
			return cd >= value
		},
		between: function(cd, value, value2) {
			return cd >= value && cd <= value2
		},
		range: function(cd, value) {
			return $.inArray(cd, value) != -1
		},
		less: function(cd, value) {
			return cd < value
		},
		lte: function(cd, value) {
			return cd <= value
		}
	};
	cFilterData.convert = function(cd, dataType) {
		if (cd == null || cd === "") {
			return ""
		} else if (dataType == "string") {
			cd = (cd + "").trim().toUpperCase()
		} else if (dataType == "date") {
			cd = Date.parse(cd)
		} else if (dataType == "number") {
			if (cd * 1 == cd) {
				cd = cd * 1
			}
		} else if (dataType == "bool") {
			cd = String(cd).toLowerCase()
		}
		return cd
	};
	cFilterData.convertEx = function(cd, dt, condition, column) {
		var dt2 = pq.getDataType({
				dataType: dt
			}),
			_f = pq.filter.conditions[condition],
			f = _f[dt2];
		if (f) {
			return this.convert(cd, dt2)
		} else {
			if (_f.string) {
				if (column) {
					cd = pq.format(column, cd)
				}
				return condition == "regexp" ? cd : this.convert(cd, "string")
			} else if (_f.number) {
				return this.convert(cd, "number")
			}
		}
	};
	cFilterData.prototype = {
		addMissingConditions: function(rules) {
			var that = this.that;
			rules.forEach(function(rule) {
				var filter = that.getColumn({
					dataIndx: rule.dataIndx
				}).filter || {};
				rule.condition = rule.condition === undefined ? pq.filter.getVal(filter)[2] : rule.condition
			})
		},
		clearFilters: function(CM) {
			CM.forEach(function(column) {
				var filter = column.filter,
					conds = pq.filter.conditions;
				if (filter) {
					(filter.crules || []).forEach(function(crule) {
						if ((conds[crule.condition] || {}).nr) {
							crule.condition = undefined
						}
						crule.value = crule.value2 = undefined
					})
				}
			})
		},
		compatibilityCheck: function(ui) {
			var data = ui.data,
				rule, str = "Incorrect filter parameters. Please check upgrade guide";
			if (data) {
				if (rule = data[0]) {
					if (rule.hasOwnProperty("dataIndx") && rule.hasOwnProperty("value")) {
						throw str
					}
				} else if (!ui.rules) {
					throw str
				}
			}
		},
		copyRuleToColumn: function(rule, column, oper) {
			var filter = column.filter = column.filter || {},
				crules = rule.crules || [],
				crule0 = crules[0],
				condition = crule0 ? crule0.condition : rule.condition,
				value = crule0 ? crule0.value : rule.value,
				value2 = crule0 ? crule0.value2 : rule.value2;
			if (oper == "remove") {
				filter.on = false;
				if (condition) {
					filter.crules = [{
						condition: condition,
						value: condition == "range" ? [] : undefined
					}]
				} else {
					filter.crules = undefined
				}
			} else {
				filter.on = true;
				filter.mode = rule.mode;
				filter.crules = crule0 ? crules : [{
					condition: condition,
					value: value,
					value2: value2
				}]
			}
		},
		filter: function(objP) {
			objP = objP || {};
			this.compatibilityCheck(objP);
			var that = this.that,
				o = that.options,
				header = false,
				data = objP.data,
				rules = objP.rules = objP.rules || (objP.rule ? [objP.rule] : []),
				rule, column, apply = !data,
				DM = o.dataModel,
				FM = o.filterModel,
				mode = objP.mode || FM.mode,
				oper = objP.oper,
				replace = oper == "replace",
				CM = apply ? that.colModel : this.getCMFromRules(rules),
				j = 0,
				rulesLength = rules.length;
			if (oper != "remove") this.addMissingConditions(rules);
			if (apply) {
				if (that._trigger("beforeFilter", null, objP) === false) {
					return
				}
				objP.header != null && (header = objP.header);
				if (replace) {
					this.clearFilters(CM)
				}
				for (; j < rulesLength; j++) {
					rule = rules[j];
					column = that.getColumn({
						dataIndx: rule.dataIndx
					});
					this.copyRuleToColumn(rule, column, oper)
				}
			} else {
				for (; j < rulesLength; j++) {
					rule = rules[j];
					column = CM[j];
					this.copyRuleToColumn(rule, column)
				}
			}
			var obj2 = {
				header: header,
				CM: CM,
				data: data,
				rules: rules,
				mode: mode
			};
			if (DM.location == "remote" && FM.type != "local") {
				that.remoteRequest({
					apply: apply,
					CM: CM,
					callback: function() {
						return that._onDataAvailable(obj2)
					}
				})
			} else {
				obj2.source = "filter";
				obj2.trigger = false;
				return that._onDataAvailable(obj2)
			}
		},
		hideRows: function(arrS, data, FMmode) {
			var i = 0,
				len = data.length,
				rowData;
			for (; i < len; i++) {
				rowData = data[i];
				rowData.pq_hidden = rowData.pq_filter = !this.isMatchRow(rowData, arrS, FMmode)
			}
		},
		filterLocalData: function(objP) {
			objP = objP || {};
			var self = this,
				that = self.that,
				ui, data = objP.data,
				apply = !data,
				CM = apply ? that.colModel : objP.CM,
				arrS = self.getRulesFromCM({
					CM: CM,
					apply: apply
				}),
				options = that.options,
				DM = options.dataModel,
				iSort = that.iSort,
				filtered, data1 = data || DM.data,
				data2 = DM.dataUF = DM.dataUF || [],
				data11 = [],
				data22 = [],
				FM = options.filterModel,
				ui = {
					filters: arrS,
					mode: FMmode,
					data: data1
				},
				FMmode = objP.mode || FM.mode;
			if (FM.hideRows) {
				ui.hideRows = true;
				if (that._trigger("customFilter", null, ui) !== false) {
					self.hideRows(arrS, data1, FMmode)
				}
			} else {
				if (apply) {
					if (data2.length) {
						filtered = true;
						for (var i = 0, len = data2.length; i < len; i++) {
							data1.push(data2[i])
						}
						data2 = DM.dataUF = []
					} else {
						if (!arrS.length) {
							return {
								data: data1,
								dataUF: data2
							}
						} else {
							iSort.saveOrder()
						}
					}
				}
				if (FM.on && FMmode && arrS && arrS.length) {
					if (data1.length) {
						if (that._trigger("customFilter", null, ui) === false) {
							data11 = ui.dataTmp;
							data22 = ui.dataUF
						} else {
							for (var i = 0, len = data1.length; i < len; i++) {
								var rowData = data1[i];
								if (!self.isMatchRow(rowData, arrS, FMmode)) {
									data22.push(rowData)
								} else {
									data11.push(rowData)
								}
							}
						}
					}
					data1 = data11;
					data2 = data22;
					if (iSort.readSorter().length == 0) {
						data1 = iSort.sortLocalData(data1)
					}
					if (apply) {
						DM.data = data1;
						DM.dataUF = data2
					}
				} else if (filtered && apply) {
					if (iSort.readSorter().length == 0) {
						data1 = iSort.sortLocalData(data1)
					}
					ui = {
						data: data1
					};
					if (that._trigger("clearFilter", null, ui) === false) {
						data1 = ui.data
					}
					DM.data = data1;
					that._queueATriggers.filter = {
						ui: {
							type: "local"
						}
					}
				}
			}
			if (apply) {
				that._queueATriggers.filter = {
					ui: {
						type: "local",
						rules: arrS
					}
				}
			}
			return {
				data: data1,
				dataUF: data2
			}
		},
		_getRulesFromCM: function(location, filter, condition, value, value2, dataType, getValue) {
			if (condition == "between") {
				if (value === "" || value == null) {
					condition = "lte";
					value = getValue(value2, dataType, condition)
				} else if (value2 === "" || value2 == null) {
					condition = "gte";
					value = getValue(value, dataType, condition)
				} else {
					value = getValue(value, dataType, condition);
					value2 = getValue(value2, dataType, condition)
				}
			} else if (condition == "regexp") {
				if (location == "remote") {
					value = value.toString()
				} else if (typeof value == "string") {
					try {
						var modifiers = filter.modifiers || "gi";
						value = new RegExp(value, modifiers)
					} catch (ex) {
						value = /.*/
					}
				}
			} else if (condition == "range" || $.isArray(value)) {
				if (value == null) {
					return
				} else {
					if (typeof value.push == "function") {
						if (value.length === 0) {
							return
						} else if (condition != "range") {
							value = getValue(value[0], dataType, condition)
						} else {
							value = value.slice();
							for (var j = 0, len = value.length; j < len; j++) {
								value[j] = getValue(value[j], dataType, condition)
							}
						}
					}
				}
			} else if (condition) {
				value = getValue(value, dataType, condition);
				if (value2 != null) value2 = getValue(value2, dataType, condition)
			}
			var cbFn;
			if (location == "remote") {
				cbFn = ""
			} else {
				cbFn = ((filter.conditions || {})[condition] || {}).compare || pq.filter.conditions[condition].compare || cFilterData.conditions[condition]
			}
			return [value, value2, cbFn, condition]
		},
		getRulesFromCM: function(objP) {
			var CM = objP.CM;
			if (!CM) {
				throw "CM N/A"
			}
			var self = this,
				CMLength = CM.length,
				i = 0,
				location = objP.location,
				isRemote = location === "remote",
				rules = [],
				cFilterData = _pq.cFilterData,
				getValue = function(cd, dataType, condition) {
					if (isRemote) {
						cd = cd == null ? "" : cd;
						return cd.toString()
					} else {
						return cFilterData.convertEx(cd, dataType, condition)
					}
				};
			for (; i < CMLength; i++) {
				var column = CM[i],
					filter = column.filter;
				if (filter) {
					var dataIndx = column.dataIndx,
						dataType = column.dataType,
						rulesC = filter.crules || [filter],
						newRulesC = [],
						ruleobj, value, value2, condition, cbFn, arr;
					dataType = !dataType || dataType == "stringi" || typeof dataType == "function" ? "string" : dataType;
					rulesC.forEach(function(rule) {
						condition = rule.condition;
						value = rule.value;
						value2 = rule.value2;
						if (condition && self.isCorrect(condition, value, value2) && (arr = self._getRulesFromCM(location, filter, condition, value, value2, dataType, getValue))) {
							value = arr[0];
							value2 = arr[1];
							cbFn = arr[2];
							newRulesC.push({
								condition: arr[3],
								value: value,
								value2: value2,
								cbFn: cbFn
							})
						}
					});
					if (newRulesC.length) {
						ruleobj = {
							dataIndx: dataIndx,
							dataType: dataType
						};
						if (isRemote && newRulesC.length == 1) {
							ruleobj.value = newRulesC[0].value;
							ruleobj.value2 = newRulesC[0].value2;
							ruleobj.condition = newRulesC[0].condition
						} else {
							ruleobj.crules = newRulesC;
							ruleobj.mode = filter.mode;
							if (!isRemote) ruleobj.column = column
						}
						rules.push(ruleobj)
					}
				}
			}
			if (objP.apply || isRemote) {
				this.sortRulesAndFMIndx(rules)
			}
			return rules
		},
		getCMFromRules: function(rules) {
			var that = this.that;
			return rules.map(function(rule) {
				var col = that.getColumn({
					dataIndx: rule.dataIndx
				});
				return pq.copyObj({}, col, ["parent"])
			})
		},
		getQueryStringFilter: function() {
			var that = this.that,
				o = that.options,
				stringify = o.stringify,
				FM = o.filterModel,
				FMmode = FM.mode,
				CM = that.colModel,
				newDI = FM.newDI || [],
				rules = this.getRulesFromCM({
					CM: CM,
					location: "remote"
				}),
				obj, filter = "";
			if (FM && FM.on && rules) {
				if (rules.length) {
					obj = {
						mode: FMmode,
						data: rules
					};
					filter = stringify ? JSON.stringify(obj) : obj
				} else {
					filter = "";
					if (newDI.length) {
						that._trigger("clearFilter")
					}
				}
			}
			return filter
		},
		isCorrect: function(condition, value, value2) {
			var conditions = pq.filter.conditions,
				obj = conditions[condition];
			if (obj) {
				if ((value == null || value === "") && (value2 == null || value2 === "")) {
					if (!obj.nr) {
						return false
					}
				}
				return true
			} else {
				throw "filter condition NA"
			}
		},
		isMatchCell: function(s, rowData) {
			var dataIndx = s.dataIndx,
				that = this.that,
				column = s.column,
				dataType = s.dataType,
				value, value2, condition, cbFn, mode = s.mode,
				found = [],
				find, rules = s.crules,
				rule, len = rules.length,
				cd = rowData[dataIndx],
				cd2;
			for (var i = 0; i < len; i++) {
				rule = rules[i];
				condition = rule.condition;
				value = rule.value;
				value2 = rule.value2;
				cbFn = rule.cbFn;
				if (condition) {
					if (condition === "regexp") {
						cd2 = cd == null ? "" : cd
					} else {
						cd2 = cFilterData.convertEx(cd, dataType, condition, column)
					}
					found.push(cbFn.call(that, cd2, value, value2, rowData, column) ? true : false)
				}
			}
			len = found.length;
			if (mode === "AND") {
				for (i = 0; i < len; i++) {
					find = found[i];
					if (!find) {
						return false
					}
				}
				return true
			} else {
				for (i = 0; i < len; i++) {
					find = found[i];
					if (find) {
						return true
					}
				}
				return false
			}
		},
		isMatchRow: function(rowData, rules, FMmode) {
			var i = 0,
				len = rules.length,
				rule, found, isAND = FMmode == "AND",
				isOR = !isAND;
			if (len == 0) {
				return true
			}
			for (; i < len; i++) {
				rule = rules[i];
				found = this.isMatchCell(rule, rowData);
				if (found) rule.found = true;
				if (isOR && found) {
					return true
				}
				if (isAND && !found) {
					return false
				}
			}
			return isAND
		},
		onFilterChange: function() {
			var that = this.that,
				o = that.options,
				columns = that.columns,
				FM = o.filterModel,
				isRemote = FM.type == "remote",
				oldDI = FM.oldDI || [],
				noRows = !o.dataModel.data.length,
				cls = "pq-col-filtered",
				takeAllRules = isRemote || noRows,
				dis = (FM.rules || []).reduce(function(arr, rule) {
					if (rule.found || takeAllRules) {
						arr.push(rule.dataIndx)
					}
					return arr
				}, []);
			oldDI.forEach(function(di) {
				var $cell = that.getCellHeader({
						dataIndx: di
					}),
					col = columns[di];
				if ($cell.length) {
					$cell.removeClass(cls);
					that.getCellFilter({
						dataIndx: di
					}).removeClass(cls)
				}
				col.clsHead = (col.clsHead || "").split(" ").filter(function(_cls) {
					return _cls !== cls
				}).join(" ")
			});
			dis.forEach(function(di) {
				var $cell = that.getCellHeader({
						dataIndx: di
					}),
					col = columns[di];
				if ($cell.length) {
					$cell.addClass(cls);
					that.getCellFilter({
						dataIndx: di
					}).addClass(cls)
				}
				col.clsHead = (col.clsHead || "") + " " + cls
			});
			FM.oldDI = FM.newDI = dis
		},
		onLoad: function() {
			var dataUF = this.that.options.dataModel.dataUF;
			if (dataUF) {
				dataUF.length = 0
			}
		},
		sortRulesAndFMIndx: function(rules) {
			var FM = this.that.options.filterModel,
				newDI = FM.newDI;
			rules.sort(function(a, b) {
				var di1 = a.dataIndx,
					di2 = b.dataIndx,
					i1 = newDI.indexOf(di1),
					i2 = newDI.indexOf(di2);
				if (i1 >= 0 && i2 >= 0) {
					return i1 - i2
				} else if (i1 >= 0) {
					return -1
				} else if (i2 >= 0) {
					return 1
				} else {
					return 0
				}
			});
			FM.rules = rules
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		cSort = _pq.cSort = function(that) {
			var self = this;
			self.that = that;
			self.sorters = [];
			self.tmpPrefix = "pq_tmp_";
			self.cancel = false
		};
	_pq.pqGrid.prototype.sort = function(ui) {
		ui = ui || {};
		if (ui.data) {
			return this.iSort._sortLocalData(ui.sorter, ui.data)
		}
		var that = this,
			options = this.options,
			DM = options.dataModel,
			data = DM.data,
			SM = options.sortModel,
			type = SM.type;
		if ((!data || !data.length) && type == "local") {
			return
		}
		var EM = options.editModel,
			iSort = this.iSort,
			oldSorter = iSort.getSorter(),
			newSorter, evt = ui.evt,
			single = ui.single == null ? iSort.readSingle() : ui.single,
			cancel = iSort.readCancel();
		if (ui.sorter) {
			if (ui.addon) {
				ui.single = single;
				ui.cancel = cancel;
				newSorter = iSort.addon(ui)
			} else {
				newSorter = ui.sorter
			}
		} else {
			newSorter = iSort.readSorter()
		}
		if (!newSorter.length && !oldSorter.length) {
			return
		}
		if (EM.indices) {
			that.blurEditor({
				force: true
			})
		}
		var ui2 = {
			dataIndx: newSorter.length ? newSorter[0].dataIndx : null,
			oldSorter: oldSorter,
			sorter: newSorter,
			source: ui.source,
			single: single
		};
		if (that._trigger("beforeSort", evt, ui2) === false) {
			iSort.cancelSort();
			return
		}
		iSort.resumeSort();
		if (type == "local") {
			iSort.saveOrder()
		}
		iSort.setSorter(newSorter);
		iSort.setSingle(single);
		iSort.writeSorter(newSorter);
		iSort.writeSingle(single);
		if (type == "local") {
			DM.data = iSort.sortLocalData(data, !ui.skipCustomSort);
			this._queueATriggers["sort"] = {
				evt: evt,
				ui: ui2
			};
			if (ui.refresh !== false) {
				this.refreshView()
			}
		} else if (type == "remote") {
			this._queueATriggers["sort"] = {
				evt: evt,
				ui: ui2
			};
			if (!ui.initByRemote) {
				this.remoteRequest({
					initBySort: true,
					callback: function() {
						that._onDataAvailable()
					}
				})
			}
		}
	};
	cSort.prototype = {
		addon: function(ui) {
			ui = ui || {};
			var sorter = ui.sorter[0],
				uiDataIndx = sorter.dataIndx,
				uiDir = sorter.dir,
				single = ui.single,
				cancel = ui.cancel,
				oldSorters = this.readSorter(),
				oldSorter = oldSorters[0];
			if (single == null) {
				throw "sort single N/A"
			}
			if (uiDataIndx != null) {
				if (single && !ui.tempMultiple) {
					oldSorters = oldSorters.length ? [oldSorters[0]] : [];
					oldSorter = oldSorters[0];
					if (oldSorter && oldSorter.dataIndx == sorter.dataIndx) {
						var oldDir = oldSorter.dir;
						var sortDir = oldDir === "up" ? "down" : cancel && oldDir === "down" ? "" : "up";
						if (sortDir === "") {
							oldSorters.length--
						} else {
							oldSorter.dir = sortDir
						}
					} else {
						sortDir = uiDir || "up";
						oldSorters[0] = $.extend({}, sorter, {
							dir: sortDir
						})
					}
				} else {
					var indx = this.inSorters(oldSorters, uiDataIndx);
					if (indx > -1) {
						oldDir = oldSorters[indx].dir;
						if (oldDir == "up") {
							oldSorters[indx].dir = "down"
						} else if (cancel && oldDir == "down") {
							oldSorters.splice(indx, 1)
						} else if (oldSorters.length == 1) {
							oldSorters[indx].dir = "up"
						} else {
							oldSorters.splice(indx, 1)
						}
					} else {
						oldSorters.push($.extend({}, sorter, {
							dir: "up"
						}))
					}
				}
			}
			return oldSorters
		},
		cancelSort: function() {
			this.cancel = true
		},
		resumeSort: function() {
			this.cancel = false
		},
		readSorter: function() {
			var that = this.that,
				columns = that.columns,
				sorters = (that.options.sortModel.sorter || []).filter(function(sorter) {
					return !!columns[sorter.dataIndx]
				});
			sorters = pq.arrayUnique(sorters, "dataIndx");
			return sorters
		},
		setSingle: function(m) {
			this.single = m
		},
		getSingle: function() {
			return this.single
		},
		readSingle: function() {
			return this.that.options.sortModel.single
		},
		setCancel: function(m) {
			this.cancel = m
		},
		readCancel: function() {
			return this.that.options.sortModel.cancel
		},
		saveOrder: function(data) {
			var that = this.that,
				DM = that.options.dataModel,
				pdata = that.pdata || [],
				rd;
			if (!(DM.dataUF || []).length) {
				if (!this.getSorter().length || pdata[0] && pdata[0].pq_order == null) {
					data = that.get_p_data();
					for (var i = 0, len = data.length; i < len; i++) {
						rd = data[i];
						rd && (rd.pq_order = i)
					}
				}
			}
		},
		getCancel: function() {
			return this.cancel
		},
		getQueryStringSort: function() {
			if (this.cancel) {
				return ""
			}
			var that = this.that,
				sorters = this.sorters,
				options = that.options,
				stringify = options.stringify;
			if (sorters.length) {
				return stringify ? JSON.stringify(sorters) : sorters
			} else {
				return ""
			}
		},
		getSorter: function() {
			return this.sorters
		},
		setSorter: function(sorters) {
			this.sorters = sorters.slice(0)
		},
		inSorters: function(sorters, dataIndx) {
			for (var i = 0; i < sorters.length; i++) {
				if (sorters[i].dataIndx == dataIndx) {
					return i
				}
			}
			return -1
		},
		sortLocalData: function(data, customSort) {
			var sorters = this.sorters;
			if (!sorters.length) {
				if (data.length && data[0].pq_order != null) {
					sorters = [{
						dataIndx: "pq_order",
						dir: "up",
						dataType: "integer"
					}]
				}
			}
			return this._sortLocalData(sorters, data, customSort)
		},
		compileSorter: function(sorters, data) {
			var self = this,
				that = self.that,
				columns = that.columns,
				o = that.options,
				arrFn = [],
				arrDI = [],
				arrDir = [],
				tmpPrefix = self.tmpPrefix,
				SM = o.sortModel,
				o_useCache = SM.useCache,
				ignoreCase = SM.ignoreCase,
				sortersLength = sorters.length;
			data = data || o.dataModel.data;
			for (var i = 0; i < sortersLength; i++) {
				var sorter = sorters[i],
					dataIndx = sorter.sortIndx || sorter.dataIndx,
					column = columns[dataIndx] || {},
					_dir = sorter.dir = sorter.dir || "up",
					dir = _dir == "up" ? 1 : -1,
					sortType = pq.getFn(column.sortType),
					dataType = column.dataType || sorter.dataType || "string",
					dataType = dataType == "string" && ignoreCase ? "stringi" : dataType,
					useCache = o_useCache && dataType == "date",
					_dataIndx = useCache ? tmpPrefix + dataIndx : dataIndx;
				arrDI[i] = _dataIndx;
				arrDir[i] = dir;
				if (sortType) {
					arrFn[i] = function(sortType, sort_custom) {
						return function(obj1, obj2, dataIndx, dir) {
							return sort_custom(obj1, obj2, dataIndx, dir, sortType)
						}
					}(sortType, sortObj.sort_sortType)
				} else if (dataType == "integer") {
					arrFn[i] = sortObj.sort_number
				} else if (dataType == "float") {
					arrFn[i] = sortObj.sort_number
				} else if (typeof dataType == "function") {
					arrFn[i] = function(dataType, sort_custom) {
						return function(obj1, obj2, dataIndx, dir) {
							return sort_custom(obj1, obj2, dataIndx, dir, dataType)
						}
					}(dataType, sortObj.sort_dataType)
				} else if (dataType == "date") {
					arrFn[i] = sortObj["sort_date" + (useCache ? "_fast" : "")]
				} else if (dataType == "bool") {
					arrFn[i] = sortObj.sort_bool
				} else if (dataType == "stringi") {
					arrFn[i] = sortObj.sort_locale
				} else {
					arrFn[i] = sortObj.sort_string
				}
				if (useCache) {
					self.addCache(data, dataType, dataIndx, _dataIndx)
				}
			}
			return self._composite(arrFn, arrDI, arrDir, sortersLength)
		},
		_composite: function(arrFn, arrDI, arrDir, len) {
			return function sort_composite(obj1, obj2) {
				var ret = 0,
					i = 0;
				for (; i < len; i++) {
					ret = arrFn[i](obj1, obj2, arrDI[i], arrDir[i]);
					if (ret != 0) {
						break
					}
				}
				return ret
			}
		},
		_sortLocalData: function(sorters, data, useCustomSort) {
			if (!data) {
				return []
			}
			if (!data.length || !sorters || !sorters.length) {
				return data
			}
			var self = this,
				that = self.that,
				SM = that.options.sortModel,
				sort_composite = self.compileSorter(sorters, data),
				ui = {
					sort_composite: sort_composite,
					data: data,
					sorter: sorters
				};
			if (useCustomSort && that._trigger("customSort", null, ui) === false) {
				data = ui.data
			} else {
				data.sort(sort_composite)
			}
			if (SM.useCache) {
				self.removeCache(sorters, data)()
			}
			return data
		},
		addCache: function(data, dataType, dataIndx, _dataIndx) {
			var valueFn = sortObj["get_" + dataType],
				j = data.length;
			while (j--) {
				var rowData = data[j];
				rowData[_dataIndx] = valueFn(rowData[dataIndx])
			}
		},
		removeCache: function(sorters, data) {
			var tmpPrefix = this.tmpPrefix;
			return function() {
				var i = sorters.length;
				while (i--) {
					var sorter = sorters[i],
						_dataIndx = tmpPrefix + sorter.dataIndx,
						j = data.length;
					if (j && data[0].hasOwnProperty(_dataIndx)) {
						while (j--) {
							delete data[j][_dataIndx]
						}
					}
				}
			}
		},
		writeCancel: function(m) {
			this.that.options.sortModel.cancel = m
		},
		writeSingle: function(m) {
			this.that.options.sortModel.single = m
		},
		writeSorter: function(sorter) {
			var o = this.that.options,
				SM = o.sortModel;
			SM.sorter = sorter
		}
	};
	var sortObj = {
		get_date: function(val) {
			var val2;
			return val ? isNaN(val2 = Date.parse(val)) ? 0 : val2 : 0
		},
		sort_number: function(obj1, obj2, dataIndx, dir) {
			var val1 = obj1[dataIndx],
				val2 = obj2[dataIndx];
			val1 = val1 ? val1 * 1 : 0;
			val2 = val2 ? val2 * 1 : 0;
			return (val1 - val2) * dir
		},
		sort_date: function(obj1, obj2, dataIndx, dir) {
			var val1 = obj1[dataIndx],
				val2 = obj2[dataIndx];
			val1 = val1 ? Date.parse(val1) : 0;
			val2 = val2 ? Date.parse(val2) : 0;
			return (val1 - val2) * dir
		},
		sort_date_fast: function(obj1, obj2, dataIndx, dir) {
			var val1 = obj1[dataIndx],
				val2 = obj2[dataIndx];
			return (val1 - val2) * dir
		},
		sort_dataType: function(obj1, obj2, dataIndx, dir, dataType) {
			var val1 = obj1[dataIndx],
				val2 = obj2[dataIndx];
			return dataType(val1, val2) * dir
		},
		sort_sortType: function(obj1, obj2, dataIndx, dir, sortType) {
			return sortType(obj1, obj2, dataIndx) * dir
		},
		sort_string: function(obj1, obj2, dataIndx, dir) {
			var val1 = obj1[dataIndx] || "",
				val2 = obj2[dataIndx] || "",
				ret = 0;
			if (val1 > val2) {
				ret = 1
			} else if (val1 < val2) {
				ret = -1
			}
			return ret * dir
		},
		sort_locale: function(obj1, obj2, dataIndx, dir) {
			var val1 = obj1[dataIndx] || "",
				val2 = obj2[dataIndx] || "";
			return val1.localeCompare(val2) * dir
		},
		sort_bool: function(obj1, obj2, dataIndx, dir) {
			var val1 = obj1[dataIndx],
				val2 = obj2[dataIndx],
				ret = 0;
			if (val1 && !val2 || val1 === false && val2 == null) {
				ret = 1
			} else if (val2 && !val1 || val2 === false && val1 == null) {
				ret = -1
			}
			return ret * dir
		}
	};
	pq.sortObj = sortObj
})(jQuery);
(function($) {
	function calcVisibleRows(pdata, rip1, rip2) {
		var num = 0,
			rd, i = rip1,
			len = pdata.length;
		rip2 = rip2 > len ? len : rip2;
		for (; i < rip2; i++) {
			rd = pdata[i];
			if (rd.pq_hidden !== true) {
				num++
			}
		}
		return num
	}
	var fn = $.paramquery.pqGrid.prototype;
	fn.calcVisibleRows = calcVisibleRows;

	function cMerge(that) {
		var self = this;
		self.that = that;
		self.mc = null;
		that.on("dataReadyDone colMove groupShowHide", function(evt, ui) {
			if (that.options.mergeCells && ui.source !== "pager") {
				self.init()
			}
		});
		that.on("colAdd colRemove", self.alterColumn.bind(self)).on("change", self.onChange.bind(self));
		that.Merge = function() {
			return self
		}
	}
	$.paramquery.cMerge = cMerge;
	cMerge.prototype = {
		auto: function(arr, mc) {
			var that = this.that,
				data = that.pdata;
			mc = mc || [];
			arr.forEach(function(dataIndx) {
				var rc = 1,
					ci = that.colIndxs[dataIndx],
					j = data.length;
				while (j--) {
					var cd = data[j][dataIndx],
						cd_prev = data[j - 1] ? data[j - 1][dataIndx] : undefined;
					if (cd_prev !== undefined && cd == cd_prev) {
						rc++
					} else if (rc > 1) {
						mc.push({
							r1: j,
							c1: ci,
							rc: rc,
							cc: 1
						});
						rc = 1
					}
				}
			});
			return mc
		},
		calcVisibleColumns: function(CM, ci1, ci2) {
			var num = 0,
				len = CM.length;
			ci2 = ci2 > len ? len : ci2;
			for (; ci1 < ci2; ci1++) {
				if (CM[ci1].hidden !== true) {
					num++
				}
			}
			return num
		},
		findNextVisibleColumn: function(CM, ci, cs) {
			var i = ci,
				column;
			for (; i < ci + cs; i++) {
				column = CM[i];
				if (!column) {
					return -1
				}
				if (!column.hidden) {
					return i
				}
			}
		},
		findNextVisibleRow: function(pdata, rip, rs) {
			var i = rip,
				rowdata;
			for (; i < rip + rs; i++) {
				rowdata = pdata[i];
				if (!rowdata) {
					return -1
				}
				if (!rowdata.pq_hidden) {
					return i
				}
			}
		},
		getData: function(ri, ci, key) {
			var mcRec, mc = this.mc;
			if (mc[ri] && (mcRec = mc[ri][ci])) {
				var data = mcRec.data;
				return data ? data[key] : null
			}
		},
		inflateRange: function(r1, c1, r2, c2) {
			var that = this.that,
				expand = false,
				max_ri2 = that.riOffset + that.pdata.length - 1,
				max_ci2 = that.colModel.length - 1,
				mc = this.mc2;
			if (!mc) {
				return [r1, c1, r2, c2]
			}
			expando: for (var i = 0, len = mc.length; i < len; i++) {
				var rec = mc[i],
					ri1 = rec.r1,
					ci1 = rec.c1,
					ri2 = ri1 + rec.rc - 1,
					ci2 = ci1 + rec.cc - 1,
					ri2 = ri2 > max_ri2 ? max_ri2 : ri2,
					ci2 = ci2 > max_ci2 ? max_ci2 : ci2,
					topEdge = ri1 < r1 && ri2 >= r1,
					botEdge = ri1 <= r2 && ri2 > r2,
					leftEdge = ci1 < c1 && ci2 >= c1,
					rightEdge = ci1 <= c2 && ci2 > c2;
				if ((topEdge || botEdge) && ci2 >= c1 && ci1 <= c2 || (leftEdge || rightEdge) && ri2 >= r1 && ri1 <= r2) {
					expand = true;
					r1 = ri1 < r1 ? ri1 : r1;
					c1 = ci1 < c1 ? ci1 : c1;
					r2 = ri2 > r2 ? ri2 : r2;
					c2 = ci2 > c2 ? ci2 : c2;
					break expando
				}
			}
			if (expand) {
				return this.inflateRange(r1, c1, r2, c2)
			} else {
				return [r1, c1, r2, c2]
			}
		},
		init: function() {
			var that = this.that,
				findNextVisibleColumn = this.findNextVisibleColumn,
				findNextVisibleRow = this.findNextVisibleRow,
				calcVisibleColumns = this.calcVisibleColumns,
				CM = that.colModel,
				mc_o = that.options.mergeCells || [],
				data = that.get_p_data(),
				arr2 = [],
				arr = [];
			for (var i = 0, len = mc_o.length; i < len; i++) {
				var rec = mc_o[i],
					r1 = rec.r1,
					v_r1 = r1,
					rowdata = data[r1],
					c1 = rec.c1,
					v_c1 = c1,
					column = CM[c1],
					rs = rec.rc,
					cs = rec.cc,
					cs2, rs2;
				if (!column || !rowdata) {
					continue
				}
				if (column.hidden) {
					v_c1 = findNextVisibleColumn(CM, c1, cs)
				}
				cs2 = calcVisibleColumns(CM, c1, c1 + cs);
				if (rowdata.pq_hidden) {
					v_r1 = findNextVisibleRow(data, r1, rs)
				}
				rs2 = calcVisibleRows(data, r1, r1 + rs);
				if (rs2 < 1 || cs2 < 1) {
					continue
				}
				arr2.push({
					r1: r1,
					c1: c1,
					rc: rs,
					cc: cs
				});
				arr[v_r1] = arr[v_r1] || [];
				arr[v_r1][v_c1] = {
					show: true,
					rowspan: rs2,
					colspan: cs2,
					o_rowspan: rs,
					o_colspan: cs,
					style: rec.style,
					cls: rec.cls,
					attr: rec.attr,
					r1: r1,
					c1: c1,
					v_r1: v_r1,
					v_c1: v_c1
				};
				var hidden_obj = {
					show: false,
					r1: r1,
					c1: c1,
					v_r1: v_r1,
					v_c1: v_c1
				};
				for (var j = r1; j < r1 + rs; j++) {
					arr[j] = arr[j] || [];
					for (var k = c1; k < c1 + cs; k++) {
						if (j == v_r1 && k == v_c1) {
							continue
						}
						arr[j][k] = hidden_obj
					}
				}
			}
			that._mergeCells = arr.length > 0;
			this.mc = arr;
			this.mc2 = arr2
		},
		ismergedCell: function(ri, ci) {
			var mc = this.mc,
				mcRec;
			if (mc && mc[ri] && (mcRec = mc[ri][ci])) {
				var v_ri = mcRec.v_r1,
					v_ci = mcRec.v_c1;
				if (ri == v_ri && ci == v_ci) {
					return {
						o_ri: mcRec.r1,
						o_ci: mcRec.c1,
						v_rc: mcRec.rowspan,
						v_cc: mcRec.colspan,
						o_rc: mcRec.o_rowspan,
						o_cc: mcRec.o_colspan
					}
				} else {
					return true
				}
			} else {
				return false
			}
		},
		isRootCell: function(r1, c1, type) {
			var mc = this.mc,
				mcRec;
			if (mc && mc[r1] && (mcRec = mc[r1][c1])) {
				if (type == "o") {
					return r1 == mcRec.r1 && c1 == mcRec.c1
				}
				var v_r1 = mcRec.v_r1,
					v_c1 = mcRec.v_c1;
				if (v_r1 == r1 && v_c1 == c1) {
					var mcRoot = mc[v_r1][v_c1];
					return {
						rowspan: mcRoot.rowspan,
						colspan: mcRoot.colspan
					}
				}
			}
		},
		removeData: function(ri, ci, key) {
			var that = this.that,
				mcRec, mc = this.mc;
			if (mc && mc[ri] && (mcRec = mc[ri][ci])) {
				var data = mcRec.data;
				if (data) {
					data[key] = null
				}
			}
		},
		getRootCell: function(r1, ci) {
			var mc = this.mc,
				v_ri, v_ci, mcRec;
			if (mc && mc[r1] && (mcRec = mc[r1][ci])) {
				v_ri = mcRec.v_r1;
				v_ci = mcRec.v_c1;
				mcRec = mc[v_ri][v_ci];
				return {
					o_ri: mcRec.r1,
					o_ci: mcRec.c1,
					v_ri: v_ri,
					v_ci: v_ci,
					v_rc: mcRec.rowspan,
					v_cc: mcRec.colspan,
					o_rc: mcRec.o_rowspan,
					o_cc: mcRec.o_colspan
				}
			}
		},
		getRootCellO: function(ri, ci, always, type) {
			type = type || "o";
			var o = type == "o",
				obj = this.getRootCell(ri, ci),
				ui;
			if (obj) {
				ui = {
					rowIndx: obj[o ? "o_ri" : "v_ri"],
					colIndx: obj[o ? "o_ci" : "v_ci"]
				};
				return this.that.normalize(ui)
			} else if (always) {
				ui = {
					rowIndx: ri,
					colIndx: ci
				}
			}
			return ui ? this.that.normalize(ui) : null
		},
		getRootCellV: function(ri, ci, always) {
			return this.getRootCellO(ri, ci, always, "v")
		},
		getClsStyle: function(v_ri, v_ci) {
			return this.mc[v_ri][v_ci]
		},
		getMergeCells: function(hcLen, curPage, dataLen) {
			var that = this.that,
				mcarr = that.options.mergeCells,
				mc, r1, c1, offset = that.riOffset,
				offset2 = offset + dataLen,
				arr = [],
				mcLen = mcarr ? mcarr.length : 0;
			for (var i = 0; i < mcLen; i++) {
				mc = mcarr[i];
				r1 = mc.r1;
				c1 = mc.c1;
				if (!curPage || r1 >= offset && r1 < offset2) {
					if (curPage) {
						r1 -= offset
					}
					r1 += hcLen;
					arr.push({
						r1: r1,
						c1: c1,
						r2: r1 + mc.rc - 1,
						c2: c1 + mc.cc - 1
					})
				}
			}
			return arr
		},
		alterColumn: function(evt, ui) {
			var o = this.that.options,
				args = ui.args,
				ci = args[1],
				n = args[0],
				add = typeof n != "number",
				n = add ? n.length : n,
				mc = o.mergeCells || [],
				j = 0,
				mlen = mc.length;
			for (; j < mlen; j++) {
				var mcR = mc[j],
					c1 = mcR.c1,
					cc = mcR.cc;
				if (add) {
					if (c1 >= ci) mcR.c1 = c1 + n;
					else if (c1 + cc > ci) mcR.cc = cc + n
				} else {
					if (c1 > ci) mcR.c1 = c1 - n;
					else if (c1 + cc > ci && cc - n > 0) {
						mcR.cc = cc - n
					}
				}
				mcR.c2 = null
			}
			this.init(mc)
		},
		onChange: function(evt, ui) {
			var o = this.that.options,
				addList = ui.addList,
				deleteList = ui.deleteList,
				mc = o.mergeCells || [],
				ri;
			for (var j = 0, mlen = mc.length; j < mlen; j++) {
				var mcR = mc[j],
					r1 = mcR.r1,
					rc = mcR.rc;
				for (var i = 0, len = addList.length; i < len; i++) {
					ri = addList[i].rowIndx;
					if (r1 >= ri) {
						r1 = mcR.r1 = r1 + 1;
						mcR.r2 = null
					} else if (r1 + rc > ri) {
						rc = mcR.rc = rc + 1;
						mcR.r2 = null
					}
				}
				for (var i = 0, len = deleteList.length; i < len; i++) {
					ri = deleteList[i].rowIndx;
					if (r1 > ri) {
						r1 = mcR.r1 = r1 - 1;
						mcR.r2 = null
					} else if (r1 + rc > ri && rc > 1) {
						rc = mcR.rc = rc - 1;
						mcR.r2 = null
					}
				}
			}
			this.init(mc)
		},
		setData: function(ri, ci, data) {
			var mcRec, mc = this.mc;
			if (mc[ri] && (mcRec = mc[ri][ci])) {
				mcRec.data = data
			}
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.pqGrid.defaults.groupModel = {
		agg: {},
		cascade: true,
		cbId: "pq_group_cb",
		collapsed: [],
		dataIndx: [],
		fixCols: true,
		groupCols: [],
		header: true,
		headerMenu: true,
		icon: ["ui-icon-triangle-1-se", "ui-icon-triangle-1-e"],
		id: "pq_gid",
		parentId: "parentId",
		childstr: "children",
		menuItems: ["merge", "fixCols", "grandSummary"],
		on: false,
		refreshOnChange: true,
		pivotColsTotal: "after",
		separator: "_",
		source: "checkboxGroup",
		showSummary: [],
		summaryInTitleRow: "collapsed",
		summaryEdit: true,
		title: [],
		titleDefault: "{0} ({1})"
	};
	pq.aggregate = {
		sum: function(arr) {
			var s = 0,
				i = arr.length,
				val;
			while (i--) {
				val = arr[i];
				if (val != null) {
					s += val - 0
				}
			}
			return s
		},
		avg: function(arr, column) {
			try {
				var avg = pq.formulas.AVERAGE(arr)
			} catch (ex) {
				avg = ex
			}
			return isNaN(avg) ? null : avg
		},
		flatten: function(arr) {
			return arr.filter(function(val) {
				return val != null
			})
		},
		max: function(arr, column) {
			var len, max, temp, val, valDate, dataType = pq.getDataType(column);
			arr = this.flatten(arr);
			len = arr.length;
			if (len) {
				if (dataType == "number") {
					max = arr[0] * 1;
					while (len--) {
						temp = arr[len];
						max = temp > max || isNaN(max) ? temp : max
					}
				} else if (dataType == "date") {
					max = Date.parse(arr[0]);
					while (len--) {
						valDate = Date.parse(arr[len]);
						if (valDate > max || isNaN(max)) {
							max = valDate;
							val = arr[len]
						}
					}
					max = val
				} else {
					arr.sort();
					max = arr[len - 1]
				}
				return max
			}
		},
		min: function(arr, column) {
			var min, temp, val, len, dataType = pq.getDataType(column);
			arr = this.flatten(arr);
			len = arr.length;
			if (len) {
				if (dataType == "number") {
					min = arr[0] * 1;
					while (len--) {
						temp = arr[len] * 1;
						min = temp < min || isNaN(min) ? temp : min
					}
				} else if (dataType == "date") {
					min = Date.parse(arr[0]);
					while (len--) {
						temp = Date.parse(arr[len]);
						if (temp < min || isNaN(min)) {
							min = temp;
							val = arr[len]
						}
					}
					min = val
				} else {
					arr.sort();
					min = arr[0]
				}
				return min
			}
		},
		count: function(arr) {
			return this.flatten(arr).length
		},
		stdev: function(arr) {
			try {
				var v = pq.formulas.STDEV(arr)
			} catch (ex) {
				v = ex
			}
			return isNaN(v) ? null : v
		},
		stdevp: function(arr) {
			try {
				var v = pq.formulas.STDEVP(arr)
			} catch (ex) {
				v = ex
			}
			return isNaN(v) ? null : v
		}
	};
	var cGroup = _pq.cGroup = function(that) {
		var self = this,
			GM = self.Model = that.options.groupModel;
		self.cbId = GM.cbId;
		self.childstr = GM.childstr;
		self.id = GM.id;
		self.parentId = GM.parentId;
		self.isGroup = true;
		self.cache = {};
		self.prop = "pq_group_prop";
		self.that = that;
		Object.defineProperty(GM, "nodeClose", {
			get: function() {
				return self.fillState({})
			},
			set: function(obj) {
				self.nodeClose = obj
			}
		});
		if (GM.on) self.init()
	};
	cGroup.beforeTrigger = function(evt, that) {
		return function(state) {
			return that._trigger("beforeGroupExpand", evt, state) === false
		}
	};
	cGroup.onGroupItemClick = function(self) {
		return function(evt) {
			var $target = $(evt.target),
				dataIndx = $(this).data("indx");
			if ($target.hasClass("pq-group-remove")) {
				self.removeGroup(dataIndx)
			} else {
				self.toggleLevel(dataIndx, evt)
			}
		}
	};

	function tmpl(arr, GM, option, o) {
		arr.push("<li data-option='", option, "' class='pq-menu-item'>", "<label>", "<input type='checkbox' ", GM[option] ? "checked" : "", "/>", o["strGroup_" + option], "</label></li>")
	}
	cGroup.prototype = $.extend({}, pq.mixin.ChkGrpTree, pq.mixin.GrpTree, {
		addGroup: function(dataIndx, indx) {
			var self = this,
				that = self.that,
				GMDI = that.options.groupModel.dataIndx || [],
				obj = pq.objectify(GMDI),
				arr = GMDI.slice();
			if (dataIndx != null && !obj[dataIndx]) {
				if (indx == null) arr.push(dataIndx);
				else arr.splice(indx, 0, dataIndx);
				self.option({
					dataIndx: arr
				}, "", "", function() {
					self.triggerChange()
				})
			}
		},
		createHeader: function() {
			var self = this,
				that = self.that,
				$h = self.$header,
				o = that.options,
				BS = o.bootstrap,
				columns = that.columns,
				BS_on = BS.on,
				GM = o.groupModel,
				GMdataIndx = GM.dataIndx,
				len = GMdataIndx.length;
			while (len--) {
				if (columns[GMdataIndx[len]] == null) {
					GMdataIndx.splice(len, 1)
				}
			}
			len = GMdataIndx.length;
			if (GM.header && GM.on) {
				if ($h) {
					$h.empty()
				} else {
					$h = self.$header = $("<div class='pq-group-header ui-helper-clearfix' ></div>").appendTo(that.$top);
					$h.on("click", ".pq-group-item", cGroup.onGroupItemClick(self))
				}
				if (len) {
					var arr = [];
					for (var i = 0; i < len; i++) {
						var dataIndx = GMdataIndx[i],
							column = columns[dataIndx],
							collapsed = GM.collapsed,
							icon = BS_on ? BS.groupModel.icon : GM.icon,
							cicon = collapsed[i] ? icon[1] : icon[0];
						arr.push("<div tabindex='0' class='pq-group-item' data-indx='", dataIndx, "' >", "<span class='", self.toggleIcon, cicon, "' ></span>", column.pq_title || (typeof column.title == "string" ? column.title : dataIndx), "<span class='", self.groupRemoveIcon, "' ></span></div>")
					}
					$h[0].innerHTML = arr.join("")
				}
				self.initHeader(o, GM)
			} else if ($h) {
				$h.remove();
				self.$header = null
			}
		},
		collapse: function(level) {
			this.expand(level, true)
		},
		collapseAll: function(level) {
			this.expandAll(level, true)
		},
		collapseTo: function(address) {
			this.expandTo(address, true)
		},
		concat: function() {
			var parentIdStr = this.parentId,
				idstr = this.id,
				childstr = this.childstr;
			return function concat(ndata, children, titleRow) {
				var id = titleRow[idstr];
				children.forEach(function(rd) {
					rd[parentIdStr] = id;
					ndata.push(rd)
				});
				titleRow[childstr] = children;
				return ndata
			}
		},
		editorSummary: function(o, GM) {
			var self = this;
			return function(ui) {
				var rd = ui.rowData;
				if (rd.pq_gsummary || rd.pq_gtitle) {
					var _aggr = pq.aggregate,
						column = ui.column,
						csummary = column.summary,
						cs_edit = csummary ? csummary.edit : null,
						inArray = $.inArray,
						dt = column.dataType,
						allow, arr = [""];
					if (inArray(ui.dataIndx, GM.dataIndx) > -1) {
						return false
					}
					if (!GM.summaryEdit && !cs_edit || cs_edit === false) {
						return false
					}
					allow = self.getAggOptions(dt);
					for (var key in _aggr) {
						if (inArray(key, allow) > -1) {
							arr.push(key)
						}
					}
					if (arr.length == 1) {
						return false
					}
					return {
						type: "select",
						prepend: GM.prepend,
						options: GM.options || arr,
						valueIndx: GM.valueIndx,
						labelIndx: GM.labelIndx,
						init: GM.init || self.editorInit,
						getData: GM.getData || self.editorGetData
					}
				}
			}
		},
		editorInit: function(ui) {
			var summary = ui.column.summary,
				type, GMDI = this.options.groupModel.dataIndx;
			if (!summary) {
				summary = ui.column.summary = {}
			}
			type = summary[GMDI[ui.rowData.pq_level]] || summary.type;
			ui.$cell.find("select").val(type)
		},
		editorGetData: function(ui) {
			var column = ui.column,
				GMDI = this.options.groupModel.dataIndx,
				diLevel = GMDI[ui.rowData.pq_level],
				dt = column.dataType,
				summary = column.summary,
				val = ui.$cell.find("select").val();
			summary[summary[diLevel] ? diLevel : "type"] = val;
			this.one("beforeValidate", function(evt, ui) {
				ui.allowInvalid = true;
				ui.track = false;
				ui.history = false;
				column.dataType = "string";
				this.one(true, "change", function(evt, ui) {
					column.dataType = dt
				})
			});
			return val
		},
		expandTo: function(address, _close) {
			var that = this.that,
				close = !!_close,
				indices = address.split(","),
				len = indices.length,
				childstr = this.childstr,
				node, indx, nodes = this.getRoots(that.pdata),
				i = 0;
			while (i < len) {
				indx = indices[i];
				node = nodes[indx];
				if (node) {
					if (!close) node.pq_close = close;
					nodes = node[childstr];
					i++
				} else {
					break
				}
			}
			if (node) {
				node.pq_close = close;
				if (that._trigger("group", null, {
						node: node,
						close: close
					}) !== false) {
					this.softRefresh()
				}
			}
		},
		expandAll: function(level, close) {
			level = level || 0;
			close = !!close;
			if (this.trigger({
					all: true,
					close: close,
					level: level
				}) !== false) {
				this.that.pdata.forEach(function(rd) {
					if (rd.pq_level >= level) {
						rd.pq_close = close
					}
				});
				this.createHeader();
				this.softRefresh()
			}
		},
		expand: function(level, close) {
			level = level || 0;
			if (this.trigger({
					close: !!close,
					level: level
				}) !== false) {
				this.that.pdata.forEach(function(rd) {
					if (rd.pq_level == level) {
						rd.pq_close = close
					}
				});
				this.createHeader();
				this.softRefresh()
			}
		},
		flattenG: function(columns, group, GM, summary) {
			var self = this,
				GMDataIndx = GM.dataIndx,
				idstr = self.id,
				parentIdStr = self.parentId,
				childstr = self.childstr,
				separator = GM.separator,
				titleIndx = GM.titleIndx,
				concat = self.concat(),
				GMLen = GMDataIndx.length,
				ndata = [];
			return function flattenG(data, _level, parent, titleNest) {
				if (!GMLen) {
					return data
				}
				parent = parent || {};
				var level = _level || 0,
					children = parent[childstr],
					di = GMDataIndx[level],
					collapsed = GM.collapsed[level],
					arr = group(data, di, columns[di]);
				arr.forEach(function(_arr) {
					var titleRow, arr2 = _arr[1],
						title = _arr[0],
						titleNest2 = (titleNest ? titleNest + separator : "") + title,
						items = arr2.length;
					titleRow = {
						pq_gtitle: true,
						pq_level: level,
						pq_close: collapsed,
						pq_items: items
					};
					titleRow[idstr] = titleNest2;
					titleRow[parentIdStr] = parent[idstr];
					titleRow[childstr] = [];
					titleRow[di] = title;
					if (titleIndx) titleRow[titleIndx] = title;
					ndata.push(titleRow);
					children && children.push(titleRow);
					if (level + 1 < GMLen) {
						flattenG(arr2, level + 1, titleRow, titleNest2)
					} else {
						ndata = concat(ndata, arr2, titleRow)
					}
				});
				return ndata
			}
		},
		getAggOptions: function(dt) {
			var o = this.that.options,
				map = o.summaryOptions;
			if (dt == "integer" || dt == "float") {
				dt = "number"
			} else if (dt !== "date") {
				dt = "string"
			}
			return map[dt].split(",")
		},
		getVal: function(ignoreCase) {
			var trim = $.trim;
			return function(rd, dataIndx, column) {
				var val = rd[dataIndx],
					chg = column.groupChange;
				if (chg) {
					chg = pq.getFn(chg);
					return chg(val)
				} else {
					val = trim(val);
					return ignoreCase ? val.toUpperCase() : val
				}
			}
		},
		getSumCols: function() {
			return this._sumCols
		},
		getSumDIs: function() {
			return this._sumDIs
		},
		group: function(getVal) {
			return function group(data, di, column) {
				var obj = {},
					arr = [];
				data.forEach(function(rd) {
					rd.pq_hidden = undefined;
					var title = getVal(rd, di, column),
						indx = obj[title];
					if (indx == null) {
						obj[title] = indx = arr.length;
						arr[indx] = [title, []]
					}
					arr[indx][1].push(rd)
				});
				return arr
			}
		},
		groupData: function(pivot) {
			var self = this,
				that = self.that,
				o = that.options,
				GM = o.groupModel,
				getVal = self.getVal(GM.ignoreCase),
				GMdataIndx = GM.dataIndx,
				pdata = that.pdata,
				columns = that.columns,
				arr = self.setSumCols(GMdataIndx),
				summaryFn = function() {};
			that.pdata = self.flattenG(columns, self.group(getVal), GM, summaryFn)(pdata);
			that._trigger("before" + (pivot ? "Pivot" : "Group") + "Summary");
			self.summaryT()
		},
		hideRows: function(initIndx, level, GMmerge, GMsummaryInTitleRow) {
			var that = this.that,
				rd, hide = true,
				data = that.pdata;
			for (var i = initIndx, len = data.length; i < len; i++) {
				rd = data[i];
				if (rd.pq_gsummary) {
					if (GMmerge || GMsummaryInTitleRow) {
						if (rd.pq_level >= level) {
							rd.pq_hidden = hide
						}
					} else {
						if (rd.pq_level > level) {
							rd.pq_hidden = hide
						}
					}
				} else if (rd.pq_gtitle) {
					if (rd.pq_level <= level) {
						break
					} else {
						rd.pq_hidden = hide
					}
				} else {
					rd.pq_hidden = hide
				}
			}
		},
		init: function() {
			var self = this,
				o, GM, BS, BS_on, base_icon, that;
			self.onCMInit();
			if (!self._init) {
				self.mc = [];
				self.summaryData = [];
				that = self.that;
				o = that.options;
				GM = o.groupModel;
				BS = o.bootstrap;
				BS_on = BS.on;
				base_icon = BS_on ? "glyphicon " : "ui-icon ";
				self.groupRemoveIcon = "pq-group-remove " + base_icon + (BS_on ? "glyphicon-remove" : "ui-icon-close");
				self.toggleIcon = "pq-group-toggle " + base_icon;
				that.on("cellClick", self.onCellClick(self)).on("cellKeyDown", self.onCellKeyDown(self, GM)).on(true, "cellMouseDown", self.onCellMouseDown()).on("change", self.onChange(self, GM)).on("dataReady", self.onDataReady(self, that)).on("beforeFilterDone", function() {
					self.saveState()
				}).on("columnDragDone", self.onColumnDrag(self)).on("colMove", self.onColMove.bind(self)).on("customSort", self.onCustomSort.bind(self)).on("valChange", self.onCheckbox(self, GM)).on("refresh refreshRow", self.onRefresh(self, GM)).on("refreshHeader", self.onRefreshHeader.bind(self));
				if (GM.titleIndx || GM.titleInFirstCol) {
					that.on("CMInit", self.onCMInit.bind(self))
				}
				that.on("beforeCheck", self.onBeforeCheck.bind(self));
				self.setCascadeInit(true);
				self._init = true
			}
		},
		initHeadSortable: function() {
			var self = this,
				that = self.that,
				$h = self.$header,
				o = that.options;
			$h.sortable({
				axis: "x",
				distance: 3,
				tolerance: "pointer",
				cancel: ".pq-group-menu",
				stop: self.onSortable(self, o)
			})
		},
		initHeadDroppable: function() {
			var self = this,
				that = self.that,
				$h = self.$header;
			if ($h) {
				$h.droppable({
					accept: function($td) {
						var colIndxDrag = $td.attr("pq-col-indx") * 1;
						if (isNaN(colIndxDrag) || !that.colModel[colIndxDrag]) {
							return
						}
						return self.acceptDrop
					},
					tolerance: "pointer",
					hoverClass: "pq-drop-hover",
					drop: self.onDrop(that, self)
				});
				self.acceptDrop = true
			}
		},
		initHeader: function(o, GM) {
			var self = this;
			if (self.$header) {
				var $h = self.$header,
					$items = $h.find(".pq-group-item");
				if ($h.data("uiSortable")) {} else {
					self.initHeadSortable()
				}
				if (!$items.length) {
					$h.append("<span class='pq-group-placeholder'>" + o.strGroup_header + "</span>")
				}
				if (GM.headerMenu) {
					self.initHeaderMenu()
				}
			}
		},
		initHeaderMenu: function() {
			var self = this,
				that = self.that,
				BS_on = that.BS_on,
				o = that.options,
				$h = self.$header,
				arr = ["<ul class='pq-group-menu'><li>", BS_on ? "<span class='glyphicon glyphicon-chevron-left'></span>" : "<div><span>&nbsp;</span></div>", "<ul>"],
				GM = o.groupModel,
				menuItems = GM.menuItems,
				i = 0,
				len = menuItems.length,
				$menu;
			for (; i < len; i++) {
				tmpl(arr, GM, menuItems[i], o)
			}
			arr.push("</ul></li></ul>");
			$menu = $(arr.join("")).appendTo($h);
			$menu.menu({
				icons: {
					submenu: "ui-icon-carat-1-w"
				},
				position: {
					my: "right top",
					at: "left top"
				}
			});
			$menu.change(function(evt) {
				if (evt.target.nodeName == "INPUT") {
					var $target = $(evt.target),
						option = $target.closest("li").data("option"),
						ui = {};
					ui[option] = !o.groupModel[option];
					self.option(ui)
				}
			})
		},
		isOn: function() {
			var m = this.that.options.groupModel;
			return m.on && (m.dataIndx || []).length
		},
		getRC: function(rd) {
			var items = 1,
				self = this;
			(rd[self.childstr] || []).forEach(function(child) {
				items += self.getRC(child)
			});
			return items + (rd.pq_child_sum ? 1 : 0)
		},
		initmerge: function() {
			var self = this,
				that = self.that,
				o = that.options,
				GM = o.groupModel,
				GMmerge = GM.merge,
				summaryInTitleRow = GM.summaryInTitleRow,
				titleIndx = GM.titleIndx,
				items, CMLength = that.colModel.length,
				mc = [],
				GMDI = GM.dataIndx,
				lastLevel = GMDI.length - 1,
				pdata = that.pdata || [];
			if (GM.on) {
				if (GMmerge) {
					GMDI.forEach(function(di, level) {
						pdata.forEach(function(rd) {
							if (rd.pq_gtitle && level == rd.pq_level) {
								items = self.getRC(rd);
								mc.push({
									r1: rd.pq_ri,
									rc: items,
									c1: level,
									cc: 1
								})
							}
						})
					})
				} else if (GMDI.length) {
					pdata.forEach(function(rd) {
						if (rd.pq_gtitle) {
							if (!summaryInTitleRow || !rd.pq_close && summaryInTitleRow === "collapsed") {
								mc.push({
									r1: rd.pq_ri,
									rc: 1,
									c1: titleIndx ? that.colIndxs[titleIndx] : rd.pq_level,
									cc: CMLength
								})
							}
						}
					})
				}
			}
			if (mc.length) {
				self.mc = o.mergeCells = mc;
				that.iMerge.init()
			} else if (self.mc.length) {
				self.mc.length = 0;
				that.iMerge.init()
			}
		},
		initcollapsed: function() {
			var self = this,
				that = self.that,
				GM = that.options.groupModel,
				GMmerge = GM.merge,
				GMsummaryInTitleRow = GM.summaryInTitleRow,
				state = self.nodeClose,
				stateKey, stateClose, pdata = that.pdata,
				idstr = self.id,
				rowData, pq_gtitle, level, collapsed;
			if (pdata) {
				for (var i = 0, len = pdata.length; i < len; i++) {
					rowData = pdata[i];
					pq_gtitle = rowData.pq_gtitle;
					if (pq_gtitle) {
						level = rowData.pq_level;
						collapsed = null;
						if (state) {
							stateKey = rowData[idstr];
							stateClose = state[stateKey];
							if (stateClose != null) {
								delete state[stateKey];
								collapsed = rowData.pq_close = stateClose
							}
						}
						if (collapsed == null) collapsed = rowData.pq_close;
						if (collapsed) self.hideRows(i + 1, level, GMmerge, GMsummaryInTitleRow);
						else if (GMmerge) rowData.pq_hidden = true
					}
				}
				that._trigger("groupHideRows")
			}
		},
		updateItems: function(arr) {
			var self = this,
				items = 0,
				children, len, childstr = self.childstr;
			(arr || self.that.pdata).forEach(function(rd) {
				if (rd.pq_gtitle) {
					children = rd[childstr];
					len = children.length;
					if (len && children[0][childstr]) {
						rd.pq_items = self.updateItems(children)
					} else {
						rd.pq_items = len
					}
					items += rd.pq_items
				}
			});
			return items
		},
		removeEmptyParent: function(parent) {
			var self = this,
				pdata = self.that.pdata,
				childstr = self.childstr;
			if (!parent[childstr].length) {
				var parentP = self.getParent(parent),
					children = parentP ? parentP[childstr] : pdata,
					indx = children.indexOf(parent);
				children.splice(indx, 1);
				if (parentP) self.removeEmptyParent(parentP)
			}
		},
		addNodes: function(nodes, parentNew, indx) {
			this.moveNodes(nodes, parentNew, indx, true)
		},
		deleteNodes: function(nodes) {
			this.moveNodes(nodes, null, null, null, true)
		},
		moveNodes: function(nodes, parentNew, indx, add, remove) {
			var self = this,
				that = self.that,
				childstr = self.childstr,
				parentOld, hidden = "pq_hidden",
				o = that.options,
				GM = o.groupModel,
				GMDI = GM.dataIndx,
				id = self.id,
				indxOld, data = o.dataModel.data,
				parentIdStr = self.parentId,
				i = 0,
				len = nodes.length,
				node;
			if (parentNew) {
				var children = parentNew[childstr],
					childrenLen = children.length,
					sibling = children[0],
					indx = indx == null || indx >= childrenLen ? childrenLen : indx,
					indxDATA = data.indexOf(sibling) + indx;
				if (sibling.pq_gtitle) {
					throw "incorrect nodes"
				}
			}
			nodes = nodes.slice(0);
			if (len) {
				that._trigger("beforeMoveNode");
				for (; i < len; i++) {
					node = nodes[i];
					if (add) {
						parentNew[childstr].splice(indx++, 0, node)
					} else {
						parentOld = self.getParent(node);
						indxOld = parentOld[childstr].indexOf(node);
						if (remove) {
							parentOld[childstr].splice(indxOld, 1)
						} else {
							if (parentOld == parentNew) {
								indx = pq.moveItem(node, parentNew[childstr], indxOld, indx)
							} else {
								parentNew[childstr].splice(indx++, 0, node);
								parentOld[childstr].splice(indxOld, 1)
							}
						}
					}
					if (sibling) {
						GMDI.forEach(function(di) {
							node[di] = sibling[di]
						});
						node[parentIdStr] = sibling[parentIdStr];
						node[hidden] = sibling[hidden]
					}
					if (add) {
						data.splice(indxDATA++, 0, node)
					} else {
						indxOld = data.indexOf(node);
						if (remove) {
							data.splice(indxOld, 1)
						} else {
							indxDATA = pq.moveItem(node, data, indxOld, indxDATA)
						}
						self.removeEmptyParent(parentOld)
					}
				}
				self.updateItems();
				self.summaryT();
				if (self.isCascade(GM)) {
					self.cascadeInit();
					self.setValCBox()
				}
				that.iRefresh.addRowIndx();
				self.initmerge();
				that._trigger((add ? "add" : remove ? "delete" : "move") + "Node", null, {
					args: arguments
				});
				that.refresh({
					header: false
				})
			}
		},
		onCellClick: function(self) {
			return function(evt, ui) {
				if (ui.rowData.pq_gtitle && $(evt.originalEvent.target).hasClass("pq-group-icon")) {
					if (pq.isCtrl(evt)) {
						var rd = ui.rowData;
						self[rd.pq_close ? "expand" : "collapse"](rd.pq_level)
					} else {
						self.toggleRow(ui.rowIndxPage, evt)
					}
				}
			}
		},
		onCellMouseDown: function() {
			return function(evt, ui) {
				if (ui.rowData.pq_gtitle && $(evt.originalEvent.target).hasClass("pq-group-icon")) {
					evt.preventDefault()
				}
			}
		},
		onCellKeyDown: function(self, GM) {
			return function(evt, ui) {
				if (ui.rowData.pq_gtitle) {
					if ($.inArray(ui.dataIndx, GM.dataIndx) >= 0 && evt.keyCode == $.ui.keyCode.ENTER) {
						self.toggleRow(ui.rowIndxPage, evt);
						return false
					}
				}
			}
		},
		onChange: function(self, GM) {
			return function(evt, ui) {
				if (GM.source == ui.source || ui.source == "checkbox") {} else {
					self.summaryT();
					self.that.refresh()
				}
			}
		},
		onColumnDrag: function(self) {
			return function(evt, ui) {
				var col = ui.column,
					CM = col.colModel;
				if (CM && CM.length || col.groupable === false || col.denyGroup) {
					self.acceptDrop = false
				} else {
					self.initHeadDroppable()
				}
			}
		},
		onCustomSort: function(evt, ui) {
			var self = this,
				that = self.that,
				o = that.options,
				GM = o.groupModel,
				GMdi = GM.dataIndx,
				sorter = ui.sorter,
				di = (sorter[0] || {}).dataIndx,
				column = that.columns[di],
				indexOfDI = GMdi.indexOf(di);
			if (GMdi.length && sorter.length == 1) {
				if (indexOfDI >= 0 && column.groupChange) {
					return
				}
				if (di == "pq_order" || (column.summary || {}).type) {
					return self._delaySort(ui)
				} else {
					var sorter2 = GMdi.map(function(di) {
						return {
							dataIndx: di,
							dir: sorter[0].dir
						}
					}).concat(sorter);
					sorter2 = pq.arrayUnique(sorter2, "dataIndx");
					return self._delaySort(ui, function(data) {
						if (GM.titleIndx == di) {
							ui.sort_composite = sorter2.map(function(_sorter) {
								return that.iSort.compileSorter([_sorter], data)
							})
						} else {
							ui.sort_composite = sorter2.map(function(_sorter) {
								if (_sorter.dataIndx == di) {
									return that.iSort.compileSorter([_sorter], data)
								}
							})
						}
					})
				}
			}
		},
		_delaySort: function(ui, cb) {
			var self = this,
				that = self.that,
				pdata = that.pdata;
			if (pdata && pdata.length) {
				that.one("skipGroup", function() {
					cb && cb(pdata);
					ui.data = pdata;
					self.onCustomSortTree({}, ui);
					that.pdata = ui.data;
					self.summaryRestore();
					return false
				});
				return false
			}
		},
		summaryRestore: function() {
			var self = this,
				childstr = self.childstr,
				that = self.that;

			function _s(titleRows, parent) {
				var data2 = [];
				titleRows.forEach(function(rd) {
					data2.push(rd);
					_s(rd[childstr] || [], rd).forEach(function(_rd) {
						data2.push(_rd)
					})
				});
				if (parent && parent.pq_child_sum) {
					data2.push(parent.pq_child_sum)
				}
				return data2
			}
			that.pdata = _s(self.getRoots())
		},
		onDrop: function(that, self) {
			return function(evt, ui) {
				var colIndxDrag = ui.draggable.attr("pq-col-indx") * 1,
					dataIndx = that.colModel[colIndxDrag].dataIndx;
				self.addGroup(dataIndx);
				self.acceptDrop = false
			}
		},
		onSortable: function(self, o) {
			return function() {
				var arr = [],
					GMDataIndx = o.groupModel.dataIndx,
					refresh, $items = $(this).find(".pq-group-item"),
					$item, dataIndx;
				$items.each(function(i, item) {
					$item = $(item);
					dataIndx = $item.data("indx");
					if (GMDataIndx[i] !== dataIndx) {
						refresh = true
					}
					arr.push(dataIndx)
				});
				if (refresh) {
					self.option({
						dataIndx: arr
					}, "", "", function() {
						self.triggerChange()
					})
				}
			}
		},
		onDataReady: function(self, that) {
			return function() {
				var GM = that.options.groupModel,
					GMLen = GM.dataIndx.length;
				if (GM.on) {
					if (GMLen || GM.grandSummary) {
						if (that._trigger("skipGroup") !== false) {
							self.groupData();
							self.buildCache()
						}
						that.iRefresh.addRowIndx();
						self.refreshColumns();
						if (GMLen) {
							self.initcollapsed();
							self.initmerge();
							if (self.isCascade(GM)) {
								self.cascadeInit()
							}
						}
					} else {
						self.refreshColumns()
					}
					self.setValCBox()
				}
				self.createHeader()
			}
		},
		onColMove: function() {
			var self = this,
				GM = self.that.options.groupModel;
			if (GM.titleInFirstCol) {
				self.that.refreshView();
				return false
			} else if (GM.titleIndx) {} else {
				self.initmerge()
			}
		},
		option: function(ui, refresh, source, fn) {
			var di = ui.dataIndx,
				self = this,
				that = self.that,
				diLength = di ? di.length : 0,
				o = that.options,
				GM = o.groupModel,
				oldGM = $.extend({}, GM),
				evtObj = {
					source: source,
					oldGM: oldGM,
					ui: ui
				},
				GMdataIndx = GM.dataIndx;
			if (that._trigger("beforeGroupOption", null, evtObj) == false) {
				return
			}
			if (ui.agg) {
				self.updateAgg(ui.agg, GM.agg)
			}
			if (GM.on && GMdataIndx.length && (ui.on === false || diLength === 0)) {
				self.showRows()
			}
			$.extend(GM, ui);
			if (fn) fn();
			self.init();
			self.setOption();
			that._trigger("groupOption", null, evtObj);
			if (refresh !== false) {
				that.refreshView()
			}
		},
		showRows: function() {
			this.that.options.dataModel.data.forEach(function(rd) {
				if (rd.pq_hidden) {
					rd.pq_hidden = undefined
				}
			})
		},
		renderBodyCell: function(o, GM) {
			var self = this,
				checkbox = GM.checkbox,
				level = GM.dataIndx.length - (self.isPivot() ? 1 : 0),
				titleInFirstCol = GM.titleIndx,
				_indent = titleInFirstCol ? GM.indent : 0,
				indent = _indent * level,
				arrCB, chk = "";
			if (level) indent += _indent;
			return function(ui) {
				var rd = ui.rowData,
					title, useLabel, column = ui.column,
					render = column.renderLabel;
				if (ui.Export) {
					return
				} else {
					title = render && render.call(self.that, ui);
					title = title || ui.formatVal || ui.cellData;
					if (checkbox && titleInFirstCol) {
						arrCB = self.renderCB(checkbox, rd, GM.cbId);
						if (arrCB) {
							chk = arrCB[0]
						}
					}
					useLabel = chk && (column.useLabel || GM.useLabel);
					return {
						text: (useLabel ? "<label>" : "") + chk + (title == null ? "" : title) + (useLabel ? "</label>" : ""),
						style: "text-indent:" + indent + "px;"
					}
				}
			}
		},
		renderCell: function(o, GM) {
			var renderTitle = this.renderTitle(o, GM),
				renderBodyCell = this.renderBodyCell(o, GM),
				renderSummary = this.renderSummary(o);
			return function(column, isTitle) {
				column._renderG = function(ui) {
					var rd = ui.rowData,
						gtitle = rd.pq_gtitle;
					if (isTitle && gtitle) {
						return renderTitle(ui)
					} else if (gtitle || rd.pq_gsummary) {
						return renderSummary(ui)
					} else if (GM.titleIndx == ui.dataIndx) {
						return renderBodyCell(ui)
					}
				}
			}
		},
		renderSummary: function(o) {
			var that = this.that,
				GMDI = o.groupModel.dataIndx;
			return function(ui) {
				var rd = ui.rowData,
					val, column = ui.column,
					summary = column.summary,
					type, title;
				if (summary && (type = summary[GMDI[rd.pq_level]] || summary.type)) {
					title = o.summaryTitle[type];
					if (typeof title == "function") {
						return title.call(that, ui)
					} else {
						val = ui.formatVal;
						if (val == null) {
							val = ui.cellData;
							val = val == null ? "" : val
						}
						if (typeof val == "number" && !column.format && parseInt(val) !== val) {
							val = val.toFixed(2)
						}
						if (title) {
							return title.replace("{0}", val)
						} else {
							return val
						}
					}
				}
			}
		},
		updateformatVal: function(GM, ui, level) {
			var di = GM.dataIndx[level],
				column = this.that.columns[di];
			if (column && column.format && column != ui.column) {
				ui.formatVal = pq.format(column, ui.cellData)
			}
		},
		renderTitle: function(o, GM) {
			var self = this,
				that = self.that,
				rtl = o.rtl,
				checkbox = GM.checkbox,
				BS = o.bootstrap,
				clsArr = ["pq-group-title-cell"],
				titleInFirstCol = GM.titleIndx,
				indent = GM.indent,
				bts_on = BS.on,
				icon = bts_on ? BS.groupModel.icon : GM.icon,
				icons = bts_on ? ["glyphicon " + icon[0], "glyphicon " + icon[1]] : ["ui-icon " + icon[0], "ui-icon " + icon[1]],
				arrCB, chk;
			return function(ui) {
				var rd = ui.rowData,
					column = ui.column,
					useLabel = column.useLabel,
					collapsed, level, title, clsIcon, indx;
				if (ui.cellData != null) {
					if (!rd.children.length) {}
					collapsed = rd.pq_close;
					level = rd.pq_level;
					title = GM.title;
					self.updateformatVal(GM, ui, level);
					title = column.renderLabel || title[level] || GM.titleDefault;
					title = typeof title === "function" ? title.call(that, ui) : title.replace("{0}", ui.formatVal || ui.cellData).replace("{1}", rd.pq_items);
					title = title == null ? ui.formatVal || ui.cellData : title;
					indx = collapsed ? 1 : 0;
					clsIcon = "pq-group-icon " + icons[indx];
					if (ui.Export) {
						return title
					} else {
						if (checkbox && titleInFirstCol && self.isCascade(GM)) {
							arrCB = self.renderCB(checkbox, rd, GM.cbId);
							if (arrCB) {
								chk = arrCB[0];
								if (arrCB[1]) clsArr.push(arrCB[1])
							}
						}
						useLabel = chk && (useLabel != null ? useLabel : GM.useLabel);
						return {
							text: [useLabel ? "<label>" : "", "<span class='", clsIcon, "'></span>", chk, title, useLabel ? "</label>" : ""].join(""),
							cls: clsArr.join(" "),
							style: "text-align:" + (rtl ? "right" : "left") + ";text-indent:" + indent * level + "px;"
						}
					}
				}
			}
		},
		triggerChange: function() {
			this.that._trigger("groupChange")
		},
		removeGroup: function(dataIndx) {
			var self = this;
			self.option({
				dataIndx: self.that.options.groupModel.dataIndx.filter(function(di) {
					return di != dataIndx
				})
			}, "", "", function() {
				self.triggerChange()
			})
		},
		refreshColumns: function() {
			var that = this.that,
				o = that.options,
				GM = o.groupModel,
				GM_on = GM.on,
				fixCols = GM.fixCols,
				renderCell = this.renderCell(o, GM),
				columns = that.columns,
				column, csummary, groupIndx = GM.dataIndx,
				groupIndxLen = groupIndx.length,
				colIndx, CM = that.colModel,
				i = CM.length;
			while (i--) {
				column = CM[i];
				if (column._renderG) {
					delete column._renderG
				}
				if (column._nodrag) {
					delete column._nodrag;
					delete column._nodrop
				}
				if (GM_on && (csummary = column.summary) && csummary.type) {
					renderCell(column)
				}
			}
			o.geditor = GM_on ? this.editorSummary(o, GM) : undefined;
			if (GM_on) {
				if (GM.titleIndx) {
					column = columns[GM.titleIndx];
					renderCell(column, true)
				} else {
					for (i = groupIndxLen - 1; i >= 0; i--) {
						column = columns[groupIndx[i]];
						renderCell(column, true)
					}
					if (fixCols && !GM.titleInFirstCol) {
						for (i = 0; i < groupIndxLen; i++) {
							colIndx = that.getColIndx({
								dataIndx: groupIndx[i]
							});
							column = CM[colIndx];
							column._nodrag = column._nodrop = true;
							if (colIndx != i) {
								that.iDragColumns.moveColumn(colIndx, i, true);
								that.refreshCM(null, {
									group: true
								})
							}
						}
					}
				}
			}
		},
		saveState: function() {
			var self = this,
				cache = self.nodeClose = self.nodeClose || {};
			self.fillState(cache)
		},
		setSumCols: function(GMdataIndx) {
			var sumCols = [],
				sumDIs = [];
			GMdataIndx = pq.objectify(GMdataIndx);
			this.that.colModel.forEach(function(column) {
				var summary = column.summary,
					di;
				if (summary && summary.type) {
					di = column.dataIndx;
					if (!GMdataIndx[di]) {
						sumCols.push(column);
						sumDIs.push(di)
					}
				}
			});
			this._sumCols = sumCols;
			this._sumDIs = sumDIs;
			return [sumCols, sumDIs]
		},
		setOption: function() {
			var self = this;
			if (self._init) {
				self.refreshColumns();
				self.summaryData.length = 0;
				self.initmerge()
			}
		},
		softRefresh: function() {
			var self = this,
				that = self.that;
			self.pdata = null;
			that.pdata.forEach(function(rd) {
				delete rd.pq_hidden
			});
			self.initcollapsed();
			self.initmerge();
			that.refresh({
				header: false
			})
		},
		toggleLevel: function(dataIndx, evt) {
			var GM = this.that.options.groupModel,
				collapsed = GM.collapsed,
				level = $.inArray(dataIndx, GM.dataIndx),
				all = pq.isCtrl(evt) ? "All" : "",
				close = collapsed[level];
			this[(close ? "expand" : "collapse") + all](level)
		},
		trigger: function(ui) {
			var evt = ui.evt,
				rd = ui.rd,
				_level = ui.level,
				all = ui.all,
				close = ui.close,
				that = this.that,
				level, di, val, i, GM = that.options.groupModel,
				groupIndx = GM.dataIndx,
				collapsed = GM.collapsed,
				_before = cGroup.beforeTrigger(evt, that),
				state = {};
			if (rd) {
				level = rd.pq_level;
				di = groupIndx[level], val = rd[di];
				close = !rd.pq_close;
				state = {
					level: level,
					close: close,
					group: val
				};
				if (_before(state)) {
					return false
				}
				rd.pq_close = close
			} else if (all) {
				state = {
					all: true,
					close: close,
					level: _level
				};
				if (_before(state)) {
					return false
				}
				for (i = _level; i < groupIndx.length; i++) {
					collapsed[i] = close
				}
			} else if (_level != null) {
				state = {
					level: _level,
					close: close
				};
				if (_before(state)) {
					return false
				}
				collapsed[_level] = close
			}
			return that._trigger("group", null, state)
		},
		toggleRow: function(rip, evt) {
			var that = this.that,
				pdata = that.pdata,
				rd = pdata[rip];
			if (this.trigger({
					evt: evt,
					rd: rd
				}) !== false) {
				this.softRefresh()
			}
		}
	});
	var fn = _pq.pqGrid.prototype;
	fn.Group = function(ui) {
		var iGV = this.iGroup;
		if (ui == null) {
			return iGV
		} else {
			iGV.expandTo(ui.indx)
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		_pgrid = _pq.pqGrid.prototype,
		pq_options = _pgrid.options;
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iDrag = new cDnD(grid)
	});
	var cDnD = _pq.cDrag = function(grid) {
		var self = this,
			o = grid.options,
			rtl = self.rtl = o.rtl,
			m = o.dragModel;
		if (m.on) {
			self.that = grid;
			o.postRenderInterval = o.postRenderInterval || -1;
			self.model = m;
			self.ns = ".pq-drag";
			m.tmplDragN = self.rtlfy(rtl, m.tmplDragN);
			m.tmplDrag = self.rtlfy(rtl, m.tmplDrag);
			grid.on("CMInit", self.onCMInit.bind(self)).on("create", self.onCreate.bind(self))
		}
	};
	_pgrid.Drag = function() {
		return this.iDrag
	};
	pq_options.dragModel = {
		afterDrop: function() {},
		beforeDrop: function(evt, uiDrop) {
			var Drag = this.Drag(),
				nodes = Drag.getUI().nodes,
				obj = this,
				T = this.Tree(),
				G = this.Group();
			if (T.isOn()) obj = T;
			else if (G.isOn()) obj = G;
			Drag.clean();
			obj.deleteNodes(nodes)
		},
		diDrag: -1,
		dragNodes: function(rd) {
			return [rd]
		},
		contentHelper: function(diHelper, dragNodes) {
			var rd = dragNodes[0],
				len = dragNodes.length;
			return diHelper.map(function(di) {
				return rd[di]
			}).join(", ") + (len > 1 ? " ( " + len + " )" : "")
		},
		clsHandle: "pq-drag-handle",
		clsDnD: "pq-dnd",
		clsNode: "pq-dnd-drag",
		iconAccept: "ui-icon ui-icon-check",
		iconReject: "ui-icon ui-icon-cancel",
		tmplDragN: "<span class='ui-icon ui-icon-grip-dotted-vertical pq-drag-handle' style='cursor:move;position:absolute;left:2px;top:4px;'>&nbsp;</span>",
		tmplDrag: "<span class='ui-icon ui-icon-grip-dotted-vertical pq-drag-handle' style='cursor:move;vertical-align:text-bottom;touch-action:none;float:left;'>&nbsp;</span>",
		cssHelper: {
			opacity: .7,
			position: "absolute",
			height: 25,
			width: 200,
			overflow: "hidden",
			background: "#fff",
			border: "1px solid",
			boxShadow: "4px 4px 2px #aaaaaa",
			zIndex: 1001
		},
		tmplHelper: "<div class='pq-border-0 pq-grid-cell' style='pointer-events: none;'>" + "<span class='pq-icon' style='vertical-align:text-bottom;margin:0 5px;'></span>" + "<span></span>" + "</div>"
	};
	cDnD.prototype = {
		addIcon: function(icon) {
			var cls = "pq-icon";
			this.$helper.find("." + cls).attr("class", "").addClass(cls + " " + icon)
		},
		addAcceptIcon: function() {
			this.addIcon(this.model.iconAccept)
		},
		addRejectIcon: function() {
			this.addIcon(this.model.iconReject)
		},
		getHelper: function(evt) {
			var self = this,
				that = self.that,
				m = self.model,
				clsNode = m.clsNode,
				$cell = $(evt.target).closest(".pq-grid-cell,.pq-grid-number-cell"),
				cellObj = self.cellObj = that.getCellIndices({
					$td: $cell
				}),
				diHelper = m.diHelper || [m.diDrag],
				rd = cellObj.rowData,
				dragNodes = cellObj.nodes = m.dragNodes.call(that, rd, evt),
				html = m.contentHelper.call(that, diHelper, dragNodes),
				$helper = self.$helper = $(m.tmplHelper);
			$helper.find("span:eq(1)").html(html);
			dragNodes.forEach(function(node) {
				that.addClass({
					rowData: node,
					cls: clsNode
				})
			});
			self.addRejectIcon();
			$helper.addClass("pq-theme pq-drag-helper").css(m.cssHelper).data("Drag", self);
			return $helper[0]
		},
		getUI: function() {
			return this.cellObj
		},
		grid: function() {
			return this.that
		},
		isSingle: function() {
			return this.getData().length == 1
		},
		onCMInit: function() {
			var grid = this.that,
				m = this.model,
				isDraggable = m.isDraggable,
				col = grid.columns[m.diDrag],
				str = col ? m.tmplDrag : m.tmplDragN;
			(col || grid.options.numberCell).postRender = function(ui) {
				if (!isDraggable || isDraggable.call(grid, ui)) $(ui.cell).prepend(str)
			}
		},
		onCreate: function() {
			var self = this,
				m = self.model,
				cursorAt = {
					top: 20
				},
				numberDrag = m.diDrag == -1;
			self.that.on(true, "cellMouseDown", self.onCellMouseDown.bind(self));
			cursorAt[self.rtl ? "right" : "left"] = 2;
			self.ele = self.that.$cont.children(":first").addClass(m.clsDnD + (numberDrag ? " pq-drag-number" : "")).draggable($.extend({
				cursorAt: cursorAt,
				containment: "document",
				appendTo: "body"
			}, m.options, {
				handle: "." + m.clsHandle,
				helper: self.getHelper.bind(self),
				revert: self.revert.bind(self)
			}))
		},
		onDrop: function(evtName, evt, ui) {
			this.model[evtName].call(this.that, evt, ui)
		},
		clean: function() {
			var self = this;
			self.getUI().nodes.forEach(function(node) {
				self.that.removeClass({
					rowData: node,
					cls: self.model.clsNode
				})
			})
		},
		revert: function(dropped) {
			var self = this;
			self.clean();
			if (!dropped) self.$helper.hide("explode", function() {
				$(this).remove()
			})
		},
		rtlfy: function(rtl, style) {
			var obj = {
				left: "right",
				right: "left"
			};
			return rtl ? style.replace(/left|right/g, function(match) {
				return obj[match]
			}) : style
		},
		onCellMouseDown: function(evt) {
			var self = this,
				m = self.model,
				$target = $(evt.originalEvent.target);
			if ($target.closest("." + m.clsHandle).length) {
				evt.preventDefault()
			}
		},
		over: function(evt, ui) {
			this.addAcceptIcon()
		},
		out: function(evt, ui) {
			this.addRejectIcon()
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		_pgrid = _pq.pqGrid.prototype,
		pq_options = _pgrid.options;
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iDrop = new cDnD(grid)
	});
	_pgrid.Drop = function() {
		return this.iDrop
	};
	pq_options.dropModel = {
		accept: ".pq-dnd",
		clsParent: "pq-dnd-parent",
		drop: function(evt, uiDrop) {
			var Drag = uiDrop.helper.data("Drag"),
				grid = this,
				G = grid.Group(),
				T = grid.Tree(),
				rdDrop = uiDrop.rowData,
				top = uiDrop.ratioY() <= .5,
				rowIndx = uiDrop.rowIndx,
				rowIndx = rowIndx == null ? rowIndx : rowIndx + (top ? 0 : 1),
				fn = function(G, isTree) {
					if (rdDrop || isTree) {
						var indx, parent = grid.iDrop.parent,
							children = G.getChildren(parent),
							clen = children.length;
						if (parent || isTree) {
							if (clen) {
								if (rdDrop)
									if (rdDrop == parent) indx = top ? null : 0;
									else indx = children.indexOf(rdDrop) + (top ? 0 : 1);
								else indx = clen
							}
							if (sameGrid) G.moveNodes(nodes, parent, indx);
							else {
								G.addNodes(nodes, parent, indx)
							}
						}
					}
				};
			if (Drag) {
				var uiDrag = Drag.getUI(),
					sameGrid = Drag.grid() == grid,
					nodes = uiDrag.nodes;
				if (G.isOn()) {
					fn(G)
				} else if (T.isOn()) {
					fn(T, true)
				} else {
					if (sameGrid) grid.moveNodes(nodes, rowIndx);
					else {
						grid.addNodes(nodes, rowIndx)
					}
				}
			}
		},
		getParent: function(evt, ui) {
			var grid = this,
				rd = ui.rowData,
				o = grid.options,
				divider = o.dropModel.divider,
				G = grid.Group(),
				Gon = G.isOn(),
				T = grid.Tree(),
				parent, w, helper, wleft, hleft, Ton = T.isOn();
			if (rd) {
				if (Ton) {
					if (divider) {
						w = grid.widget();
						wleft = w.offset().left;
						helper = ui.helper;
						hleft = helper.offset().left;
						parent = (o.rtl ? wleft + w.width() - hleft - helper.width() > divider : hleft - wleft > divider) ? rd : T.getParent(rd)
					} else parent = T.getParent(rd)
				} else if (Gon) parent = G.isFolder(rd) ? rd : G.getParent(rd);
				return parent
			}
		}
	};
	var cDnD = _pq.cDrop = function(grid) {
		var self = this,
			o = grid.options,
			m = o.dropModel;
		self.model = m;
		if (m.on) {
			self.that = grid;
			self.rtl = o.rtl;
			self.ns = ".pq-drop";
			grid.on("create", self.onCreate.bind(self))
		}
	};
	cDnD.prototype = {
		addUI: function(ui, evt, $cell) {
			var self = this;
			ui.$cell = $cell;
			ui.ratioY = function() {
				return self.ratioY(evt, $cell)
			};
			$.extend(ui, self.that.getCellIndices({
				$td: $cell
			}))
		},
		callFn: function(fn, evt, ui) {
			var fn2 = this.model[fn];
			if (fn2) return fn2.call(this.that, evt, ui)
		},
		feedback: function(evt, $cell) {
			if ($cell.length) {
				var self = this,
					arr = self.getCellY($cell),
					y1 = arr[0],
					$cont = self.that.$cont,
					ratioY = self.ratioY(evt, $cell),
					contLeft = $cont.offset().left,
					y2 = arr[1];
				self.$feedback = self.$feedback || self.newF();
				self.$feedback.css({
					top: ratioY <= .5 ? y1 - 1 : y2 - 1,
					left: contLeft,
					width: $cont[0].clientWidth,
					zIndex: 1e4
				});
				$cont.css("cursor", "copy")
			}
		},
		getCell: function($ele) {
			return $ele.closest(".pq-grid-cell,.pq-grid-number-cell")
		},
		getCellY: function($cell) {
			var pos = $cell.offset(),
				y1 = pos.top,
				y2 = y1 + $cell[0].offsetHeight;
			return [y1, y2]
		},
		getDrag: function(ui) {
			return ui.helper.data("Drag")
		},
		isOn: function() {
			return this.model.on
		},
		isOver: function() {},
		newF: function() {
			return $("<svg class='pq-border-0' style='box-sizing:border-box;position:absolute;border-width:1.5px;border-style:dashed;pointer-events:none;height:0;'></svg>").appendTo(document.body)
		},
		onCreate: function() {
			var self = this;
			self.that.$cont.droppable($.extend({
				tolerance: "pointer"
			}, self.model.options, {
				accept: self.model.accept,
				over: self.onOver.bind(self),
				out: self.onOut.bind(self),
				drop: self.onDrop.bind(self)
			}))
		},
		onOver: function(evt, ui) {
			var self = this,
				divider = self.model.divider,
				Drag = self.Drag = self.getDrag(ui);
			ui.draggable.on("drag.pq", self.onDrag.bind(self));
			if (divider) self.$left = $("<svg class='pq-border-0' style='position:absolute;width:0;height:100%;" + (self.rtl ? "right:" : "left:") + divider + "px;top:0;border-style:dashed;border-width:1.5px;pointer-events:none;'></svg>").appendTo(self.that.$cont);
			if (Drag) {
				Drag.over(evt, ui)
			}
			self.isOver = function() {
				return true
			};
			self.callFn("over", evt, ui)
		},
		onOut: function(evt, ui) {
			ui.draggable.off("drag.pq");
			this.removeFeedback();
			var Drag = this.getDrag(ui),
				$left = this.$left;
			$left && $left.remove();
			if (Drag) {
				Drag.out(evt, ui)
			}
			this.isOver = function() {};
			this.callFn("out", evt, ui)
		},
		setParent: function set(rd) {
			var that = this.that,
				clsParent = this.model.clsParent,
				oldParent = this.parent;
			if (oldParent != rd) {
				if (oldParent) {
					that.removeClass({
						rowData: oldParent,
						cls: clsParent
					})
				}
				if (rd) {
					that.addClass({
						rowData: rd,
						cls: clsParent
					})
				}
			}
			this.parent = rd
		},
		setDeny: function(evt, ui, $cell) {
			var self = this,
				Drag = self.Drag;
			self.denyDrop = self.callFn("isDroppable", evt, ui) === false;
			if (self.denyDrop) {
				if (Drag) Drag.out();
				self.removeFeedback()
			} else {
				if (Drag) Drag.over();
				self.feedback(evt, $cell);
				self.setParent(self.callFn("getParent", evt, ui))
			}
		},
		onDrag: function(evt, ui) {
			var self = this,
				$ele = pq.elementFromXY(evt),
				$cell = self.getCell($ele);
			if ($cell.length || self.that.$cont[0].contains($ele[0])) {
				self.addUI(ui, evt, $cell);
				self.setDeny(evt, ui, $cell)
			}
		},
		onDropX: function(evt, ui) {
			var self = this,
				that = self.that,
				draggable = ui.draggable,
				inst, Drag = ui.helper.data("Drag"),
				fn = function(evtName) {
					if (Drag && Drag.grid() != that) Drag.onDrop(evtName, evt, ui);
					else {
						try {
							inst = draggable.draggable("instance");
							inst.options[evtName].call(draggable[0], evt, ui)
						} catch (ex) {}
					}
				};
			fn("beforeDrop");
			self.callFn("drop", evt, ui);
			self.setParent();
			fn("afterDrop")
		},
		onDrop: function(evt, ui) {
			var self = this,
				$cell, $ele = pq.elementFromXY(evt);
			self.onOut(evt, ui);
			if (!self.denyDrop) {
				$cell = self.getCell($ele);
				if ($cell.length || self.that.$cont[0].contains($ele[0])) {
					self.addUI(ui, evt, $cell);
					self.onDropX(evt, ui)
				}
			}
		},
		onMouseout: function() {
			this.removeFeedback()
		},
		onMouseup: function() {
			var self = this;
			self.removeFeedback();
			$(document).off(self.ns);
			self.that.$cont.off(self.ns)
		},
		ratioY: function(evt, $cell) {
			if ($cell.length) {
				var y = evt.pageY,
					arr = this.getCellY($cell),
					y1 = arr[0],
					y2 = arr[1];
				return (y - y1) / (y2 - y1)
			}
		},
		removeFeedback: function() {
			var self = this;
			if (self.$feedback) {
				self.$feedback.remove();
				self.$feedback = null
			}
			self.that.$cont.css("cursor", "");
			requestAnimationFrame(function() {
				self.setParent()
			})
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.pqGrid.defaults.contextMenu = {
		preInit: function(evt) {
			if (pq.isCtrl(evt)) return false
		},
		init: function(evt, ui) {
			if (ui.$td) {
				var obj = {
						r1: ui.rowIndx,
						c1: ui.colIndx,
						rc: 1,
						cc: 1
					},
					S = this.Selection();
				if (S.indexOf(obj) == -1) {
					S.removeAll();
					this.Range(obj).select()
				}
				this.focus(ui)
			}
		}
	};
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iContext = new cContext(grid)
	});
	var cContext = _pq.cContext = function(that) {
		var self = this,
			o = that.options;
		self.model = o.contextMenu;
		self.that = that;
		self.ns = ".pq-cmenu";
		self.rtl = o.rtl;
		that.on("context", self.onContext.bind(self)).on("destroy", self.removeMenu.bind(self))
	};
	cContext.prototype = {
		createMenu: function(items) {
			items = items.filter(function(item) {
				return item != null
			});
			var self = this,
				html = "",
				$div;
			items.forEach(function(item, i) {
				html += self.getItemHtml(item, i)
			});
			$div = $("<div dir='" + (self.rtl ? "rtl" : "ltr") + "' class='pq-cmenu pq-theme pq-popup'><table>" + html + "</table></div>").appendTo(document.body);
			$div.find(".pq-cmenu-item").each(function(i, item) {
				$(item).data("item", items[i])
			});
			$div.on("mouseover", self.onMouseOver.bind(self)).on("remove", self.onRemove(self));
			return $div
		},
		get$Item: function(evt) {
			return $(evt.target).closest(".pq-cmenu-item")
		},
		getItem: function(evt) {
			return this.get$Item(evt).data("item")
		},
		getItemHtml: function(item, i) {
			if (item == "separator") {
				return "<tr class='pq-cmenu-item'><td colspan=4 class='pq-bg-3' style='height:1px;padding:0;'></td></td>"
			} else {
				var style = item.style,
					tooltip = item.tooltip,
					styleStr = style ? 'style="' + style + '"' : "",
					attr = tooltip ? 'title="' + tooltip + '"' : "";
				return "<tr class='pq-cmenu-item " + (item.disabled ? "pq_disabled" : "") + " " + (item.cls || "") + "' indx=" + i + ">" + "<td><span class='" + (item.icon || "") + "' />" + "</td><td " + styleStr + " " + attr + ">" + item.name + "</td><td>" + (item.shortcut || "") + "</td><td><span class='" + (item.subItems ? "pq-submenu " + "ui-icon ui-icon-triangle-1-" + (this.rtl ? "w" : "e") : "") + "' />" + "</td></tr>"
			}
		},
		onContext: function(evt, ui) {
			if (this.model.on) return this.showMenu(evt, ui)
		},
		onRemove: function(self) {
			return function() {
				$(this).find(".pq-cmenu-item").each(self.removeSubMenu)
			}
		},
		onMouseDown: function(evt) {
			if (!this.getItem(evt)) {
				this.removeMenu()
			}
		},
		onclickDoc: function(evt) {
			var item = this.getItem(evt),
				ret, action;
			if (item) {
				if (!item.disabled) {
					action = item.action;
					if (action) {
						ret = action.call(this.that, evt, this.ui, item);
						if (ret !== false) this.removeMenu()
					}
				}
			}
		},
		onMouseOver: function(evt) {
			var self = this,
				rtl = self.rtl,
				item = self.getItem(evt),
				$subMenu, strMenu = "subMenu",
				$item = self.get$Item(evt),
				sitems = (item || {}).subItems;
			$item.siblings().each(self.removeSubMenu);
			if (sitems && sitems.length && !$item[0][strMenu]) {
				$subMenu = self.createMenu(sitems);
				$subMenu.position({
					my: rtl ? "right top" : "left top",
					at: rtl ? "left top" : "right top",
					of: $item,
					collision: "flipfit"
				});
				$item[0][strMenu] = $subMenu
			}
		},
		removeMenu: function() {
			if (this.$menu) {
				this.$menu.remove();
				delete this.$menu;
				$(document.body).off(this.ns)
			}
		},
		removeSubMenu: function(i, node) {
			var strMenu = "subMenu";
			if (node[strMenu]) {
				node[strMenu].remove();
				delete node[strMenu]
			}
		},
		showMenu: function(evt, ui) {
			var self = this,
				rtl = self.rtl,
				m = self.model,
				ns = self.ns,
				that = self.that,
				$menu = self.$menu,
				type = ui.type,
				strItems = type + "Items",
				items = m[strItems] || (type ? m.items : m.miscItems),
				items = typeof items == "function" ? items.call(that, evt, ui) : items;
			if ($menu) self.removeMenu();
			if (items && items.length) {
				if (m.preInit.call(that, evt, ui) !== false) {
					m.init.call(that, evt, ui);
					self.ui = ui;
					$menu = self.$menu = self.createMenu(items);
					$menu.position({
						my: (rtl ? "right" : "left") + " top",
						of: evt,
						collision: "fit"
					});
					$(document.body).on("click" + ns, self.onclickDoc.bind(self)).on("mousedown" + ns + " touchstart" + ns, self.onMouseDown.bind(self));
					return false
				}
			}
		}
	}
})(jQuery);
(function($) {
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iAnim = new cAnim(grid)
	});
	var _pq = $.paramquery,
		cAnim = _pq.cAnim = function(grid) {
			var self = this,
				model = self.model = grid.options.animModel;
			self.grid = grid;
			self.nodes = [];
			if (model.on) {
				grid.on(model.events, self.onBefore.bind(self))
			}
		},
		_pgrid = _pq.pqGrid.prototype,
		pq_options = _pgrid.options;
	_pgrid.Anim = function() {
		return this.iAnim
	};
	pq_options.animModel = {
		duration: 290,
		events: "beforeSortDone beforeFilterDone beforeRowExpandDone beforeGroupExpandDone beforeMoveNode " + "beforeAutoRowHeight beforeValidateDone beforeTreeExpandDone onResizeHierarchy",
		eventsH: "beforeColAddDone beforeColRemoveDone beforeHideColsDone beforeColumnCollapseDone beforeColMoveDone beforeFlex columnResize"
	};
	_pq.mixAnim = {
		cleanUp: function() {
			(this.data || []).forEach(function(rd) {
				rd.pq_top = rd.pq_hideOld = undefined;
			});
			this.data = this.render = null
		},
		stop: function() {
			this.nodes.forEach(function($nodes) {
				$nodes.stop()
			});
			this.nodes = []
		}
	};
	cAnim.prototype = $.extend({
		isActive: function() {
			return this._active
		},
		onBefore: function(evt, ui) {
			if (evt.isDefaultPrevented() || this.data) {
				return
			}
			var self = this,
				grid = self.grid,
				iR = grid.iRenderB,
				data = self.data = iR.data,
				$rows, render = self.render = [];
			try {
				self.htTbl = iR.dims.htTbl;
				iR.eachV(function(rd, i) {
					$rows = iR.get$Row(i);
					rd.pq_render = 1;
					render.push([rd, $rows.clone(), $rows.map(function(j, row) {
						return row.parentNode
					})])
				});
				data.forEach(function(rd, i) {
					rd.pq_top = iR.getTop(i);
					rd.pq_hideOld = rd.pq_hidden
				});
				grid.one("refresh", self.oneRefresh.bind(self));
				setTimeout(function() {
					self.cleanUp()
				})
			} catch (ex) {
				self.data = null
			}
		},
		oneRefresh: function() {
			if (!this.data) {
				return
			}
			var self = this,
				grid = self.grid,
				iR = grid.iRenderB,
				duration = self.model.duration,
				$tbl = $([iR.$tbl_left[0], iR.$tbl_right[0]]),
				htTbl = self.htTbl,
				htTbl2 = iR.dims.htTbl,
				$rows;
			self.stop();
			self._active = true;
			if (htTbl > htTbl2) {
				$tbl.css("height", htTbl)
			}
			setTimeout(function() {
				$tbl.css("height", iR.dims.htTbl);
				self._active = false
			}, duration);
			iR.eachV(function(rd, i) {
				delete rd.pq_render;
				var top = iR.getTop(i),
					topOld = rd.pq_top,
					obj1, obj2;
				if (topOld != top || rd.pq_hideOld) {
					$rows = iR.get$Row(i);
					if (topOld == null || rd.pq_hideOld) {
						obj1 = {
							opacity: 0
						};
						obj2 = {
							opacity: 1
						}
					} else {
						obj1 = {
							top: topOld
						};
						obj2 = {
							top: top
						}
					}
					$rows.css(obj1).animate(obj2, duration);
					self.nodes.push($rows)
				}
			});
			self.render.forEach(self.removeRows.bind(self));
			self.cleanUp()
		},
		removeRows: function(arr) {
			var self = this,
				rd = arr[0],
				$rows, ri = rd.pq_ri,
				top, duration = self.model.duration,
				obj = {
					opacity: 1,
					top: rd.pq_top
				};
			if (rd.pq_render) {
				delete rd.pq_render;
				$rows = arr[1].each(function(j, row) {
					$(row).removeAttr("id").appendTo(arr[2][j]).children().removeAttr("id")
				});
				$rows.css(obj);
				if (ri == null || rd.pq_hidden) {
					obj = {
						opacity: 0
					}
				} else {
					try {
						top = self.grid.iRenderB.getTop(ri);
						obj = {
							top: top
						}
					} catch (ex) {
						obj = {
							opacity: 0
						}
					}
				}
				$rows.animate(obj, duration, function() {
					if (this.parentNode) this.parentNode.removeChild(this)
				});
				self.nodes.push($rows)
			}
		}
	}, _pq.mixAnim)
})(jQuery);
(function($) {
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iAnimH = new cAnimH(grid)
	});
	var _pq = $.paramquery,
		cAnimH = _pq.cAnimH = function(grid) {
			var self = this,
				o = grid.options,
				model = self.model = o.animModel;
			self.grid = grid;
			self.rtl = o.rtl ? "right" : "left";
			self.nodes = [];
			if (model.on) {
				grid.on(model.eventsH, self.onBeforeCol.bind(self))
			}
		},
		_pgrid = _pq.pqGrid.prototype;
	_pgrid.AnimH = function() {
		return this.iAnimH
	};
	cAnimH.prototype = $.extend({
		get$Col: function() {
			var grid = this.grid,
				iR = grid.iRenderB,
				iRH = grid.iRenderHead,
				iRS = grid.iRenderSum,
				$cellsB = iR.getAllCells(),
				$cellsH = iRH.getAllCells(),
				$cellsS = iRS.getAllCells();
			return function(ci) {
				return iR.get$Col(ci, $cellsB).add(iRH.get$Col(ci, $cellsH)).add(iRS.get$Col(ci, $cellsS))
			}
		},
		onBeforeCol: function(evt) {
			if (evt.isDefaultPrevented() || this.data) {
				return
			}
			var self = this,
				grid = self.grid,
				data = self.data = grid.getColModel(),
				$cols, get$Col = self.get$Col(),
				iR = grid.iRenderB,
				render = self.render = [];
			try {
				data.forEach(function(col, i) {
					col.pq_hideOld = col.hidden;
					col.pq_top = iR.getLeft(i)
				})
			} catch (ex) {
				self.cleanUp();
				return
			}
			iR.eachH(function(col, i) {
				$cols = get$Col(i);
				col.pq_render = 1;
				render.push([col, $cols.clone(), $cols.map(function(j, col) {
					return col.parentNode.id
				})])
			});
			grid.one("softRefresh refresh", self.oneRefreshCol.bind(self))
		},
		oneRefreshCol: function() {
			if (!this.data) {
				return
			}
			var self = this,
				grid = self.grid,
				iR = grid.iRenderB,
				duration = self.model.duration,
				get$Col = self.get$Col(),
				$cols;
			self.stop();
			iR.eachH(function(col, i) {
				delete col.pq_render;
				var left = iR.getLeft(i),
					leftOld = col.pq_top,
					rtl = self.rtl,
					o0 = {
						opacity: 0
					},
					o1 = {
						opacity: 1
					},
					o = {};
				if (leftOld != left || col.pq_hideOld) {
					$cols = get$Col(i);
					if (leftOld == null) {
						$cols.css(o0).animate(o1, duration)
					} else if (col.pq_hideOld) {
						o0[rtl] = leftOld;
						o1[rtl] = left;
						$cols.css(o0).animate(o1, duration)
					} else {
						o[rtl] = left;
						$cols.css(rtl, leftOld).animate(o, duration)
					}
					self.nodes.push($cols)
				}
			});
			self.render.forEach(self.removeCols.bind(self));
			self.cleanUp()
		},
		removeCols: function(arr) {
			var self = this,
				col = arr[0],
				$cols, duration = self.model.duration,
				grid = self.grid,
				iR = grid.iRenderB,
				ci = grid.colIndxs[col.dataIndx],
				left, obj;
			if (col.pq_render) {
				delete col.pq_render;
				$cols = arr[1].each(function(j, col) {
					$(col).removeAttr("id").appendTo(document.getElementById(arr[2][j]))
				});
				if (ci == null || col.hidden) {
					$cols.css("opacity", 1);
					obj = {
						opacity: 0
					}
				} else {
					left = iR.getLeft(ci);
					obj = {
						left: left
					}
				}
				$cols.animate(obj, duration, function() {
					if (this.parentNode) this.parentNode.removeChild(this)
				});
				self.nodes.push($cols)
			}
		}
	}, _pq.mixAnim)
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		defaults = _pq.pqGrid.defaults;
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iFillHandle = new cFillHandle(grid)
	});
	defaults.fillHandle = "all";
	defaults.autofill = true;
	var cFillHandle = _pq.cFillHandle = function(that) {
		var self = this;
		self.$wrap;
		self.locked;
		self.sel;
		self.that = that;
		self.rtl = that.options.rtl;
		that.on("selectChange", self.onSelectChange(self)).on("selectEnd", self.onSelectEnd(self)).on("assignTblDims", self.onRefresh(self)).on("keyDown", self.onKeyDown.bind(self))
	};
	cFillHandle.prototype = {
		getLT: function(x2y2, d, tbl, WidthORHeight) {
			var d2 = d / 2,
				left = x2y2 - d2,
				right = Math.min(left + d, tbl["offset" + WidthORHeight]),
				left = right - d;
			return left
		},
		create: function() {
			var self = this,
				that = self.that,
				area;
			if (self.locked) return;
			self.remove();
			area = that.Selection().address();
			if (area.length !== 1) return;
			var area = area[0],
				r2 = area.r2,
				c2 = area.c2,
				iM = that.iMerge,
				parentNode = "parentNode",
				uiM = iM.getRootCellO(r2, c2, true),
				$td = that.getCell(uiM);
			if ($td.length) {
				if (that._trigger("beforeFillHandle", null, uiM) !== false) {
					var td = $td[0],
						tbl = td[parentNode][parentNode],
						cont = tbl[parentNode],
						d = 10,
						arr = that.iRenderB.getCellCoords(uiM.rowIndxPage, uiM.colIndx),
						left = self.getLT(arr[2], d, tbl, "Width"),
						top = self.getLT(arr[3], d, tbl, "Height"),
						obj = {
							position: "absolute",
							top: top,
							height: d,
							width: d,
							background: "#333",
							cursor: "crosshair",
							border: "2px solid #fff",
							zIndex: 1
						},
						$wrap = $("<div class='pq-fill-handle'></div>").appendTo(cont);
					obj[self.rtl ? "right" : "left"] = left;
					$wrap.css(obj);
					self.$wrap = $wrap;
					self.setDraggable();
					self.setDoubleClickable()
				}
			}
		},
		onSelectChange: function(self) {
			return function() {
				self.remove()
			}
		},
		onSelectEnd: function(self) {
			return function() {
				if (this.options.fillHandle) {
					self.create()
				}
			}
		},
		onRefresh: function(self) {
			var id;
			return function() {
				if (this.options.fillHandle) {
					clearTimeout(id);
					id = setTimeout(function() {
						if (self.that.element) {
							self.create()
						}
					}, 50)
				} else {
					self.remove()
				}
			}
		},
		remove: function() {
			var $wrap = this.$wrap;
			$wrap && $wrap.remove()
		},
		setDoubleClickable: function() {
			var self = this,
				$wrap = self.$wrap;
			$wrap && $wrap.on("dblclick", self.onDblClick(self.that, self))
		},
		setDraggable: function() {
			var self = this,
				$wrap = self.$wrap,
				$cont = self.that.$cont;
			$wrap && $wrap.draggable({
				helper: function() {
					return "<div style='height:10px;width:10px;cursor:crosshair;'></div>"
				},
				appendTo: $cont,
				start: self.onStart.bind(self),
				drag: self.onDrag.bind(self),
				stop: self.onStop.bind(self)
			})
		},
		patternDate: function(a) {
			var self = this;
			return function(x) {
				var dateObj = new Date(a);
				dateObj.setDate(dateObj.getDate() + (x - 1));
				return self.formatDate(dateObj)
			}
		},
		formatDate: function(dateObj) {
			return dateObj.getMonth() + 1 + "/" + dateObj.getDate() + "/" + dateObj.getFullYear()
		},
		patternDate2: function(c0, c1) {
			var d0 = new Date(c0),
				d1 = new Date(c1),
				diff, self = this,
				incrDate = d1.getDate() - d0.getDate(),
				incrMonth = d1.getMonth() - d0.getMonth(),
				incrYear = d1.getFullYear() - d0.getFullYear();
			if (!incrMonth && !incrYear || !incrDate && !incrMonth || !incrYear && !incrDate) {
				return function(x) {
					var dateObj = new Date(c0);
					if (incrDate) {
						dateObj.setDate(dateObj.getDate() + incrDate * (x - 1))
					} else if (incrMonth) {
						dateObj.setMonth(dateObj.getMonth() + incrMonth * (x - 1))
					} else {
						dateObj.setFullYear(dateObj.getFullYear() + incrYear * (x - 1))
					}
					return self.formatDate(dateObj)
				}
			}
			d0 = Date.parse(d0);
			diff = Date.parse(d1) - d0;
			return function(x) {
				var dateObj = new Date(d0 + diff * (x - 1));
				return self.formatDate(dateObj)
			}
		},
		getDT: function(cells) {
			var len = cells.length,
				i = 0,
				val, oldDT, dt, valid = pq.valid;
			for (; i < len; i++) {
				val = cells[i];
				if (valid.isFloat(val)) dt = "number";
				else if (valid.isDate(val)) dt = "date";
				if (oldDT && oldDT != dt) {
					return "string"
				}
				oldDT = dt
			}
			return dt
		},
		pattern: function(cells) {
			var dt = this.getDT(cells);
			if (dt == "string" || !dt) {
				return false
			}
			var a, b, c, len = cells.length,
				date = dt === "date";
			if (!date) {
				cells = cells.map(function(cell) {
					return cell * 1
				})
			}
			if (len === 2) {
				if (date) {
					return this.patternDate2(cells[0], cells[1])
				}
				a = cells[1] - cells[0];
				b = cells[0] - a;
				return function(x) {
					return a * x + b
				}
			}
			if (len === 3) {
				a = (cells[2] - 2 * cells[1] + cells[0]) / 2;
				b = cells[1] - cells[0] - 3 * a;
				c = cells[0] - a - b;
				return function(x) {
					return a * x * x + b * x + c
				}
			}
			return false
		},
		autofillVal: function(sel1, sel2, patternArr, xDir) {
			var that = this.that,
				r1 = sel1.r1,
				c1 = sel1.c1,
				r2 = sel1.r2,
				c2 = sel1.c2,
				r21 = sel2.r1,
				c21 = sel2.c1,
				r22 = sel2.r2,
				c22 = sel2.c2,
				val = [],
				k, i, j, sel3, x;
			if (xDir) {
				sel3 = {
					r1: r1,
					r2: r2
				};
				sel3.c1 = c21 < c1 ? c21 : c2 + 1;
				sel3.c2 = c21 < c1 ? c1 - 1 : c22;
				x = c21 - c1;
				for (i = c21; i <= c22; i++) {
					x++;
					if (i < c1 || i > c2) {
						k = 0;
						for (j = r1; j <= r2; j++) {
							val.push(patternArr[k](x, i));
							k++
						}
					}
				}
			} else {
				sel3 = {
					c1: c1,
					c2: c2
				};
				sel3.r1 = r21 < r1 ? r21 : r2 + 1;
				sel3.r2 = r21 < r1 ? r1 - 1 : r22;
				x = r21 - r1;
				for (i = r21; i <= r22; i++) {
					x++;
					if (i < r1 || i > r2) {
						k = 0;
						for (j = c1; j <= c2; j++) {
							val.push(patternArr[k](x, i));
							k++
						}
					}
				}
			}
			that.Range(sel3).value(val);
			return true
		},
		autofill: function(sel1, sel2) {
			var that = this.that,
				CM = that.colModel,
				col, dt, cells, di, i, j, obj, data = that.get_p_data(),
				pattern, patternArr = [],
				r1 = sel1.r1,
				c1 = sel1.c1,
				r2 = sel1.r2,
				c2 = sel1.c2,
				xDir = sel2.c1 != c1 || sel2.c2 != c2;
			if (xDir) {
				for (i = r1; i <= r2; i++) {
					obj = {
						sel: {
							r: i,
							c: c1
						},
						x: true
					};
					that._trigger("autofillSeries", null, obj);
					if (pattern = obj.series) {
						patternArr.push(pattern)
					} else {
						return
					}
				}
				return this.autofillVal(sel1, sel2, patternArr, xDir)
			} else {
				for (j = c1; j <= c2; j++) {
					col = CM[j];
					dt = col.dataType;
					di = col.dataIndx;
					cells = [];
					for (i = r1; i <= r2; i++) {
						cells.push(data[i][di])
					}
					obj = {
						cells: cells,
						sel: {
							r1: r1,
							c: j,
							r2: r2,
							r: r1
						}
					};
					that._trigger("autofillSeries", null, obj);
					if (pattern = obj.series || this.pattern(cells, dt)) {
						patternArr.push(pattern)
					} else {
						return
					}
				}
				return this.autofillVal(sel1, sel2, patternArr)
			}
		},
		onKeyDown: function(evt) {
			if (!this.oldAF && pq.isCtrl(evt)) {
				var self = this,
					o = self.that.options;
				self.oldAF = o.autofill;
				o.autofill = false;
				$(document.body).one("keyup", function() {
					o.autofill = self.oldAF;
					delete self.oldAF
				})
			}
		},
		onStop: function() {
			var self = this,
				that = self.that,
				autofill = that.options.autofill,
				sel1 = self.sel,
				sel2 = that.Selection().address()[0];
			if (sel1.r1 != sel2.r1 || sel1.c1 != sel2.c1 || sel1.r2 != sel2.r2 || sel1.c2 != sel2.c2) {
				if (!(autofill && self.autofill(sel1, sel2))) {
					that.Range(sel1).copy({
						dest: sel2
					})
				}
			}
			self.locked = false
		},
		onStart: function() {
			this.locked = true;
			this.sel = this.that.Selection().address()[0]
		},
		onDrag: function(evt) {
			var self = this,
				that = self.that,
				fillHandle = that.options.fillHandle,
				all = fillHandle == "all",
				hor = all || fillHandle == "horizontal",
				vert = all || fillHandle == "vertical",
				x = evt.clientX - 10,
				y = evt.clientY,
				ele = document.elementFromPoint(x, y),
				$td = $(ele).closest(".pq-grid-cell");
			if ($td.length) {
				var cord = that.getCellIndices({
						$td: $td
					}),
					sel = self.sel,
					r1 = sel.r1,
					c1 = sel.c1,
					r2 = sel.r2,
					c2 = sel.c2,
					range = {
						r1: r1,
						c1: c1,
						r2: r2,
						c2: c2
					},
					update = function(key, val) {
						range[key] = val;
						that.Range(range).select()
					},
					ri = cord.rowIndx,
					ci = cord.colIndx;
				if (all && ri <= r2 && ri >= r1 || hor && !vert) {
					if (ci > c2) {
						update("c2", ci)
					} else if (ci < c1) {
						update("c1", ci)
					}
				} else if (vert) {
					if (ri > r2) {
						update("r2", ri)
					} else if (ri < r1) {
						update("r1", ri)
					}
				}
			}
		},
		onDblClick: function(that, self) {
			return function() {
				var o = that.options,
					fillHandle = o.fillHandle;
				if (fillHandle == "all" || fillHandle == "vertical") {
					var sel = that.Selection().address()[0],
						rd, c2 = sel.c2,
						ri = sel.r2 + 1,
						data = o.dataModel.data,
						di = that.getColModel()[c2].dataIndx;
					while (rd = data[ri]) {
						if (rd[di] == null || rd[di] === "") {
							ri++
						} else {
							ri--;
							break
						}
					}
					self.onStart();
					that.Range({
						r1: sel.r1,
						c1: sel.c1,
						r2: ri,
						c2: c2
					}).select();
					self.onStop()
				}
			}
		}
	}
})(jQuery);
(function($) {
	$(document).on("pqGrid:bootup", function(evt, ui) {
		new cScroll(ui.instance)
	});
	var cScroll = $.paramquery.cScroll = function(that) {
		var self = this;
		self.that = that;
		self.ns = ".pqgrid-csroll";
		self.rtl = that.options.rtl;
		that.on("create", self.onCreate.bind(self))
	};
	cScroll.prototype = {
		onCreate: function() {
			var self = this,
				that = self.that;
			var drop = that.iDrop && that.iDrop.isOn();
			$(drop ? document : that.$cont).on("mousedown", self.onMouseDown.bind(self))
		},
		onMouseDown: function(evt) {
			var self = this,
				that = self.that,
				$target = $(evt.target),
				$draggable = self.$draggable = $target.closest(".ui-draggable"),
				isDraggable = $draggable.length,
				isFillHandle, ns = self.ns;
			if (isDraggable || $target.closest(that.$cont).length) {
				isFillHandle = $target.closest(".pq-fill-handle").length;
				$(document).on("mousemove" + ns, self[isDraggable && !isFillHandle ? "onMouseMove" : "process"].bind(self)).on("mouseup" + ns, self.onMouseUp.bind(self))
			}
		},
		onMouseMove: function(evt) {
			var self = this,
				that = self.that;
			if (self.capture || pq.elementFromXY(evt).closest(that.$cont).length && that.iDrop.isOver()) {
				self.capture = true;
				self.process(evt)
			}
		},
		onMouseUp: function() {
			$(document).off(this.ns);
			this.capture = false
		},
		process: function(evt) {
			var self = this,
				that = self.that,
				$cont = that.$cont,
				cont_ht = $cont[0].offsetHeight,
				cont_wd = $cont[0].offsetWidth,
				off = $cont.offset(),
				cont_top = off.top,
				cont_left = off.left,
				cont_bot = cont_top + cont_ht,
				cont_right = cont_left + cont_wd,
				pageY = evt.pageY,
				pageX = evt.pageX,
				diffY = pageY - cont_bot,
				diffX = pageX - cont_right,
				diffY2 = cont_top - pageY,
				diffX2 = cont_left - pageX;
			if (pageX > cont_left && pageX < cont_right && (diffY > 0 || diffY2 > 0)) {
				if (diffY > 0) {
					self.scrollV(diffY, true)
				} else if (diffY2 > 0) {
					self.scrollV(diffY2)
				}
			} else if (pageY > cont_top && pageY < cont_bot) {
				if (diffX > 0) {
					self.scrollH(diffX, true)
				} else if (diffX2 > 0) {
					self.scrollH(diffX2)
				}
			}
		},
		scrollH: function(diff, down) {
			this.scroll(diff, this.rtl ? !down : down, true)
		},
		scrollV: function(diff, down) {
			this.scroll(diff, down)
		},
		scroll: function(diff, down, x) {
			var that = this.that,
				iR = that.iRenderB,
				cr = iR.getContRight()[0],
				ht = cr[x ? "scrollWidth" : "scrollHeight"],
				scroll = pq[x ? "scrollLeft" : "scrollTop"](cr),
				factor = ht < 1e3 ? 1 : 1 + (ht - 1e3) / ht;
			diff = Math.pow(diff, factor);
			var scroll2 = scroll + (down ? diff : -diff);
			iR[x ? "scrollX" : "scrollY"](scroll2)
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.cFormula = function(that) {
		var self = this;
		self.that = that;
		self.oldF = [];
		that.one("ready", function() {
			that.on("CMInit", self.onCMInit.bind(self))
		}).on("beforePivotSummary", self.calcMainData.bind(self)).on("dataAvailable", self.onDA.bind(self)).on(true, "change", self.onChange.bind(self))
	};
	_pq.cFormula.prototype = {
		onCMInit: function() {
			var self = this;
			if (self.isFormulaChange(self.oldF, self.formulas())) {
				self.calcMainData()
			}
		},
		callRow: function(rowData, formulas, flen) {
			var that = this.that,
				j = 0;
			if (rowData) {
				for (; j < flen; j++) {
					var fobj = formulas[j],
						column = fobj[0],
						formula = fobj[1];
					rowData[column.dataIndx] = formula.call(that, rowData, column, fobj[2])
				}
			}
		},
		onDA: function() {
			this.calcMainData()
		},
		isFormulaChange: function(oldF, newF) {
			var diff = false,
				i = 0,
				ol = oldF.length,
				nl = newF.length;
			if (ol == nl) {
				for (; i < ol; i++) {
					if (oldF[i][1] != newF[i][1]) {
						diff = true;
						break
					}
				}
			} else {
				diff = true
			}
			return diff
		},
		calcMainData: function() {
			var formulas = this.formulaSave(),
				that = this.that,
				flen = formulas.length;
			if (flen) {
				var o = that.options,
					data = o.dataModel.data,
					i = data.length;
				while (i--) {
					this.callRow(data[i], formulas, flen)
				}
				that._trigger("formulaComputed")
			}
		},
		onChange: function(evt, ui) {
			var self = this,
				that = self.that,
				rObj2, formulas = self.formulas(),
				flen = formulas.length,
				addList = ui.addList,
				updateList = ui.updateList,
				fn = function(rObj) {
					self.callRow(rObj.rowData, formulas, flen)
				};
			if (flen) {
				addList.forEach(fn);
				updateList.forEach(fn);
				if (updateList.length == 1 && !addList.length) {
					rObj2 = updateList[0];
					formulas.forEach(function(f) {
						that.refreshCell({
							rowIndx: rObj2.rowIndx,
							dataIndx: f[0].dataIndx
						})
					})
				}
			}
		},
		formulas: function() {
			var that = this.that,
				arr = [],
				column, formula, cis = that.colIndxs,
				di, formulas = that.options.formulas || [];
			formulas.forEach(function(_arr) {
				di = _arr[0];
				column = that.getColumn({
					dataIndx: di
				});
				if (column) {
					formula = _arr[1];
					if (formula) {
						arr.push([column, formula, cis[di]])
					}
				}
			});
			return arr
		},
		formulaSave: function() {
			var arr = this.formulas();
			this.oldF = arr;
			return arr
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.pqGrid.defaults.treeModel = {
		cbId: "pq_tree_cb",
		source: "checkboxTree",
		childstr: "children",
		iconCollapse: ["ui-icon-triangle-1-se", "ui-icon-triangle-1-e"],
		iconFolder: ["ui-icon-folder-open", "ui-icon-folder-collapsed"],
		iconFile: "ui-icon-document",
		id: "id",
		indent: 18,
		parentId: "parentId",
		refreshOnChange: true
	};
	_pq.pqGrid.prototype.Tree = function() {
		return this.iTree
	};
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iTree = new cTree(grid)
	});
	var cTree = _pq.cTree = function(that) {
		var self = this;
		self.Model = that.options.treeModel;
		self.that = that;
		self.fns = {};
		self.init();
		self.isTree = true;
		self.cache = {};
		self.di_prev;
		self.chkRows = [];
		Object.defineProperty(self.Model, "nodeClose", {
			get: function() {
				return self.fillState({})
			},
			set: function(obj) {
				self.nodeClose = obj
			}
		})
	};
	cTree.prototype = $.extend({}, pq.mixin.ChkGrpTree, pq.mixin.GrpTree, {
		addNodes: function(_nodes, parent, indx) {
			var self = this,
				that = self.that,
				o = that.options,
				DM = o.dataModel,
				TM = self.Model,
				data = DM.data,
				parentIdstr = self.parentId,
				childstr = self.childstr,
				children, node, idstr = self.id,
				cache = {},
				rowIndx, nodes = [],
				i = 0,
				len, node, oldCache = self.cache,
				parentId, parent2, addList = [];
			_nodes.forEach(function(node) {
				parentId = node[parentIdstr];
				parent2 = parent2 || oldCache[parentId];
				self.eachChild(node, function(child, _parent) {
					var id = child[idstr];
					if (!oldCache[id] && !cache[id]) {
						cache[id] = child;
						if (_parent) child[parentIdstr] = _parent[idstr];
						nodes.push(child)
					}
				}, parent || oldCache[parentId])
			});
			nodes.forEach(function(node) {
				parentId = node[parentIdstr];
				if (!cache[parentId] && !oldCache[parentId]) delete node[parentIdstr]
			});
			parent = parent || parent2;
			children = (parent || {})[childstr] || self.getRoots() || [];
			len = children.length;
			if (len) {
				if (indx == 0) node = parent;
				else if (indx == null || indx > len) node = children[len - 1];
				else node = children[indx - 1]
			} else node = parent;
			rowIndx = data.indexOf(node) + 1;
			len = nodes.length;
			if (len) {
				for (; i < len; i++) {
					node = nodes[i];
					addList.push({
						newRow: node,
						rowIndx: rowIndx++
					})
				}
				that._digestData({
					addList: addList,
					checkEditable: false,
					source: "addNodes",
					history: TM.historyAdd
				});
				self.refreshView()
			}
		},
		updateId: function(node, id) {
			var idstr = this.id,
				parentIdstr = this.parentId,
				oldId = node[idstr],
				cache = this.cache;
			if (!cache[id]) {
				node[idstr] = id;
				cache[id] = node;
				delete cache[oldId];
				(this.getChildren(node) || []).forEach(function(child) {
					child[parentIdstr] = id
				})
			}
		},
		collapseAll: function(open) {
			this[open ? "expandNodes" : "collapseNodes"](this.that.options.dataModel.data)
		},
		collapseNodes: function(nodes, evt, open) {
			var i = 0,
				that = this.that,
				len = nodes.length,
				node, nodes2 = [],
				ui, close = !open;
			for (; i < len; i++) {
				node = nodes[i];
				if (this.isFolder(node) && this.isCollapsed(node) !== close) {
					nodes2.push(node)
				}
			}
			if (nodes2.length) {
				ui = {
					close: close,
					nodes: nodes2
				};
				if (that._trigger("beforeTreeExpand", evt, ui) !== false) {
					len = nodes2.length;
					for (i = 0; i < len; i++) {
						node = nodes2[i];
						node.pq_close = close
					}
					that._trigger("treeExpand", evt, ui);
					this.setCascadeInit(false);
					this.refreshView()
				}
			}
		},
		deleteNodes: function(nodes) {
			var self = this,
				that = self.that,
				TM = self.Model,
				i = 0,
				len, rd1, obj = {},
				id = self.id,
				deleteList = [];
			if (nodes) {
				len = nodes.length;
				for (; i < len; i++) {
					rd1 = nodes[i];
					self.eachChild(rd1, function(child) {
						var id2 = child[id];
						if (!obj[id2]) {
							obj[id2] = 1;
							deleteList.push({
								rowData: child
							})
						}
					})
				}
				that._digestData({
					deleteList: deleteList,
					source: "deleteNodes",
					history: TM.historyDelete
				});
				self.refreshView()
			}
		},
		makeLeaf: function(node) {
			node[this.childstr] = node.pq_close = node.pq_child_sum = undefined
		},
		expandAll: function() {
			this.collapseAll(true)
		},
		expandNodes: function(nodes, evt) {
			this.collapseNodes(nodes, evt, true)
		},
		expandTo: function(node) {
			var nodes = [];
			do {
				if (node.pq_close) {
					nodes.push(node)
				}
			} while (node = this.getParent(node));
			this.expandNodes(nodes)
		},
		exportCell: function(cellData, level) {
			var str = "",
				i = 0;
			for (; i < level; i++) {
				str += "- "
			}
			return str + (cellData == null ? "" : cellData)
		},
		filter: function(data, arrS, iF, FMmode, dataTmp, dataUF, hideRows) {
			var rd, ret, found, self = this,
				childstr = self.childstr,
				filterShowChildren = self.Model.filterShowChildren,
				nodes, i = 0,
				len = data.length,
				fn = function(node, _found) {
					found = _found || found;
					if (hideRows) node.pq_hidden = node.pq_filter = !_found;
					else if (_found) dataTmp.push(node);
					else dataUF.push(node)
				};
			for (; i < len; i++) {
				rd = data[i];
				ret = false;
				if (nodes = rd[childstr]) {
					if (filterShowChildren && iF.isMatchRow(rd, arrS, FMmode)) {
						self.eachChild(rd, function(_node) {
							fn(_node, true)
						});
						found = true;
						continue
					}
					ret = self.filter(nodes, arrS, iF, FMmode, dataTmp, dataUF, hideRows);
					if (ret) {
						fn(rd, true)
					}
				}
				if (!ret) {
					fn(rd, iF.isMatchRow(rd, arrS, FMmode))
				}
			}
			return found
		},
		getFormat: function() {
			var self = this,
				data = self.that.options.dataModel.data,
				format = "flat",
				i = 0,
				len = data.length,
				parentId = self.parentId,
				childstr = self.childstr,
				rd, children;
			for (; i < len; i++) {
				rd = data[i];
				if (rd[parentId] != null) {
					break
				} else if ((children = rd[childstr]) && children.length) {
					return self.getParent(children[0]) == rd ? "flat" : "nested"
				}
			}
			return format
		},
		getChildrenAll: function(rd, _data) {
			var childstr = this.childstr,
				nodes = rd[childstr] || [],
				len = nodes.length,
				i = 0,
				rd2, data = _data || [];
			for (; i < len; i++) {
				rd2 = nodes[i];
				data.push(rd2);
				if (rd2[childstr]) {
					this.getChildrenAll(rd2, data)
				}
			}
			return data
		},
		getLevel: function(rd) {
			return rd.pq_level
		},
		_groupById: function(data, _id, children, groups, level) {
			var self = this,
				gchildren, childstr = self.childstr,
				i = 0,
				len = children.length;
			for (; i < len; i++) {
				var rd = children[i],
					id = rd[_id];
				rd.pq_level = level;
				data.push(rd);
				if (gchildren = groups[id]) {
					rd[childstr] = gchildren;
					self._groupById(data, _id, gchildren, groups, level + 1)
				} else {
					if (rd.pq_close != null || rd[childstr]) rd[childstr] = []
				}
			}
		},
		groupById: function(data) {
			var self = this,
				id = self.id,
				pId, parentId = self.parentId,
				groups = {},
				group, data2 = [],
				i = 0,
				len = data.length,
				rd;
			for (; i < len; i++) {
				rd = data[i];
				pId = rd[parentId];
				pId == null && (pId = "");
				if (!(group = groups[pId])) {
					group = groups[pId] = []
				}
				group.push(rd)
			}
			self._groupById(data2, id, groups[""] || [], groups, 0);
			return data2
		},
		init: function() {
			var self = this,
				that = self.that,
				o = that.options,
				TM = self.Model,
				cbId = TM.cbId,
				di = self.dataIndx = TM.dataIndx;
			self.cbId = cbId;
			self.prop = "pq_tree_prop";
			self.id = TM.id;
			self.parentId = TM.parentId;
			self.childstr = TM.childstr;
			self.onCMInit();
			if (di) {
				if (!self._init) {
					self.on("CMInit", self.onCMInit.bind(self)).on("dataAvailable", self.onDataAvailable.bind(self)).on("dataReadyAfter", self.onDataReadyAfter.bind(self)).on("beforeCellKeyDown", self.onBeforeCellKeyDown.bind(self)).on("customSort", self.onCustomSortTree.bind(self)).on("customFilter", self.onCustomFilter.bind(self)).on("clearFilter", self.onClearFilter.bind(self)).on("change", self.onChange(self, that, TM)).on("cellClick", self.onCellClick.bind(self)).on("refresh refreshRow", self.onRefresh(self, TM)).on("valChange", self.onCheckbox(self, TM)).on("refreshHeader", self.onRefreshHeader.bind(self)).on("beforeCheck", self.onBeforeCheck.bind(self));
					self.setCascadeInit(true);
					self._init = true
				}
			} else if (self._init) {
				self.off();
				self._init = false
			}
			if (self._init) {
				o.groupModel.on = TM.summary
			}
		},
		initData: function() {
			var self = this,
				that = self.that,
				o = that.options,
				DM = o.dataModel;
			DM.data = self[self.getFormat() == "flat" ? "groupById" : "flatten"](DM.data);
			self.buildCache()
		},
		isCollapsed: function(rd) {
			return !!rd.pq_close
		},
		isOn: function() {
			return this.Model.dataIndx != null
		},
		moveNodes: function(nodes, parentNew, indx, skipHistory) {
			var self = this,
				args = arguments,
				that = self.that,
				indxOrig = indx,
				parentIdstr = self.parentId,
				idstr = self.id,
				childstr = self.childstr,
				o = that.options,
				TM = self.Model,
				DM = o.dataModel,
				dataOld, dataNew, roots = self.getRoots(),
				historySupport = !skipHistory,
				children = parentNew ? parentNew[childstr] = parentNew[childstr] || [] : roots,
				childrenLen = children.length,
				parentNewId, cache = {},
				parentOld, indxOld, nodes2 = [],
				indx = indx == null || indx >= childrenLen ? childrenLen : indx,
				i, len, node, dataNew = children;
			if (parentNew) {
				parentNewId = parentNew[idstr]
			}
			nodes.forEach(function(node) {
				cache[node[idstr]] = 1
			});
			nodes.forEach(function(node) {
				if (!cache[node[parentIdstr]]) {
					nodes2.push(node)
				}
			});
			len = nodes2.length;
			if (len) {
				that._trigger("beforeMoveNode", null, {
					args: args
				});
				if (historySupport && len > 1) {
					node = nodes2[0];
					parentOld = self.getParent(node);
					dataOld = parentOld ? parentOld[childstr] : roots;
					indxOld = dataOld.indexOf(node);
					for (i = 1; i < len; i++) {
						if (dataOld[i + indxOld] != nodes2[i]) {
							historySupport = false;
							break
						}
					}
				}
				for (i = 0; i < len; i++) {
					node = nodes2[i];
					parentOld = self.getParent(node);
					dataOld = parentOld ? parentOld[childstr] : roots;
					indxOld = dataOld.indexOf(node);
					if (parentOld == parentNew) {
						indx = pq.moveItem(node, dataNew, indxOld, indx)
					} else {
						dataNew.splice(indx++, 0, node);
						dataOld.splice(indxOld, 1)
					}
					if (TM.leafIfEmpty && parentOld && self.isEmpty(parentOld)) {
						self.makeLeaf(parentOld)
					}
					node[parentIdstr] = parentNewId
				}
				if (TM.historyMove && historySupport) that.iHistory.push({
					callback: function(redo) {
						var indxOld3 = indxOld;
						if (parentNew == parentOld && indxOld3 > indxOrig) {
							indxOld3 += 1
						}
						self.moveNodes(nodes, redo ? parentNew : parentOld, redo ? indxOrig : indxOld3, true)
					}
				});
				DM.data = self.flatten(roots);
				that._trigger("moveNode", null, {
					args: args
				});
				that.refreshView()
			}
		},
		off: function() {
			var obj = this.fns,
				that = this.that,
				key;
			for (key in obj) {
				that.off(key, obj[key])
			}
			this.fns = {}
		},
		on: function(evt, fn) {
			this.fns[evt] = fn;
			this.that.on(evt, fn);
			return this
		},
		onCellClick: function(evt, ui) {
			var self = this;
			if (ui.dataIndx == self.dataIndx && $(evt.originalEvent.target).hasClass("pq-group-icon")) {
				if (pq.isCtrl(evt)) {
					var rd = ui.rowData;
					self[rd.pq_close ? "expandAll" : "collapseAll"]()
				} else {
					self.toggleNode(ui.rowData, evt)
				}
			}
		},
		onBeforeCellKeyDown: function(evt, ui) {
			var self = this,
				that = self.that,
				rd = ui.rowData,
				$inp, di = ui.dataIndx,
				close, keyCode = evt.keyCode,
				KC = $.ui.keyCode;
			if (di == self.dataIndx) {
				if (self.isFolder(rd)) {
					close = rd.pq_close;
					if (keyCode == KC.ENTER && !that.isEditable({
							rowIndx: rd.pq_ri,
							dataIndx: di
						}) || !close && keyCode == KC.LEFT || close && keyCode == KC.RIGHT) {
						self.toggleNode(rd);
						return false
					}
				}
				if (keyCode == KC.SPACE) {
					$inp = that.getCell(ui).find("input[type='checkbox']");
					if ($inp.length) {
						$inp.click();
						return false
					}
				}
			}
		},
		hasSummary: function() {
			var T = this.Model;
			return T.summary || T.summaryInTitleRow
		},
		onChange: function(self, that, TM) {
			return function(evt, ui) {
				var source = ui.source || "",
					addListLen = ui.addList.length,
					deleteList = ui.deleteList,
					deleteListLen = deleteList.length;
				if (source.indexOf("checkbox") == -1) {
					if ((source == "undo" || source == "redo") && (addListLen || deleteListLen)) {
						self.refreshViewFull()
					} else if (self.hasSummary() && TM.refreshOnChange && !addListLen && !deleteListLen) {
						self.refreshSummary(true);
						that.refresh()
					} else if (source == "addNodes" || source == "deleteNodes") {
						self.refreshViewFull()
					}
					if (TM.leafIfEmpty) {
						deleteList.forEach(function(obj) {
							var parent = self.getParent(obj.rowData);
							if (parent && self.isEmpty(parent)) self.makeLeaf(parent)
						})
					}
				}
			}
		},
		clearFolderCheckbox: function(data) {
			var self = this,
				cbId = self.cbId;
			data.forEach(function(node) {
				if (self.isFolder(node)) {
					delete node[cbId]
				}
			})
		},
		onClearFilter: function(evt, ui) {
			var self = this;
			self.clearFolderCheckbox(ui.data);
			ui.data = self.groupById(ui.data);
			return false
		},
		onCustomFilter: function(evt, ui) {
			var self = this,
				that = self.that,
				data = self.groupById(ui.data),
				iF = that.iFilterData,
				arrS = ui.filters,
				dataTmp = [],
				dataUF = [],
				FMmode = ui.mode;
			self.filter(self.getRoots(data), arrS, iF, FMmode, dataTmp, dataUF, ui.hideRows);
			ui.dataTmp = self.groupById(dataTmp);
			ui.dataUF = dataUF;
			self.clearFolderCheckbox(ui.dataTmp);
			return false
		},
		onDataAvailable: function() {
			this.initData()
		},
		refreshSummary: function(showHideRows) {
			var self = this;
			self.summaryT();
			self.that.iRefresh.addRowIndx();
			showHideRows && self.showHideRows()
		},
		onDataReadyAfter: function() {
			var self = this,
				that = self.that,
				o = that.options,
				DM = o.dataModel,
				TM = self.Model;
			if (self.hasSummary()) {
				if (!TM.filterLockSummary || !TM.summaryInTitleRow || !DM.dataUF.length) self.refreshSummary()
			}
			self.showHideRows();
			if (self.isCascade(TM)) {
				self.cascadeInit()
			}
		},
		option: function(ui, refresh) {
			var self = this,
				that = self.that,
				TM = self.Model,
				di_prev = TM.dataIndx,
				di;
			$.extend(TM, ui);
			di = TM.dataIndx;
			self.setCellRender();
			self.init();
			if (!di_prev && di) {
				self.initData()
			}
			refresh !== false && that.refreshView()
		},
		renderCell: function(self, TM) {
			return function(ui) {
				var rd = ui.rowData,
					that = self.that,
					indent = TM.indent,
					label, column = ui.column,
					render = column.renderLabel || TM.render,
					iconCollapse = TM.iconCollapse,
					checkbox = TM.checkbox,
					isFolder = self.isFolder(rd),
					iconCls = self._iconCls(rd, isFolder, TM),
					level = rd.pq_level || 0,
					textIndent = level * indent,
					textIndentLeaf = textIndent + indent * 1,
					icon, _icon, icon2, clsArr = ["pq-group-title-cell"],
					attr, styleArr = ["text-indent:", isFolder ? textIndent : textIndentLeaf, "px;"],
					text = ui.formatVal || ui.cellData,
					arrCB, chk;
				if (render) {
					var ret = that.callFn(render, ui);
					if (ret != null) {
						if (typeof ret != "string") {
							ret.iconCls && (iconCls = ret.iconCls);
							ret.text != null && (text = ret.text);
							attr = ret.attr;
							clsArr.push(ret.cls);
							styleArr.push(ret.style)
						} else {
							text = ret
						}
					}
				}
				if (ui.Export) {
					return self.exportCell(text, level)
				} else {
					if (checkbox) {
						arrCB = self.renderCB(checkbox, rd, TM.cbId);
						if (arrCB) {
							chk = arrCB[0];
							if (arrCB[1]) clsArr.push(arrCB[1])
						}
					}
					if (isFolder) {
						_icon = rd.pq_close ? iconCollapse[1] : iconCollapse[0];
						icon = "<span class='pq-group-icon ui-icon " + _icon + "'></span>"
					}
					if (iconCls) {
						icon2 = "<span class='pq-tree-icon ui-icon " + iconCls + "'></span>"
					}
					label = chk && (column.useLabel || TM.useLabel);
					return {
						cls: clsArr.join(" "),
						attr: attr,
						style: styleArr.join(""),
						text: [icon, icon2, label ? "<label>" : "", chk, text, label ? "</label>" : ""].join("")
					}
				}
			}
		},
		refreshViewFull: function(full) {
			var self = this,
				DM = self.that.options.dataModel;
			DM.data = self.groupById(DM.data);
			self.buildCache();
			full && self.refreshView()
		},
		_iconCls: function(rd, isFolder, TM) {
			if (TM.icons) {
				var iconFolder;
				if (isFolder && (iconFolder = TM.iconFolder)) {
					return rd.pq_close ? iconFolder[1] : iconFolder[0]
				} else if (!rd.pq_gsummary) {
					return TM.iconFile
				}
			}
		},
		setCellRender: function() {
			var self = this,
				that = self.that,
				TM = self.Model,
				di, column, columns = that.columns;
			TM.summary && that.iGroup.refreshColumns();
			if (di = self.di_prev) {
				column = columns[di];
				column && (column._render = null);
				self.di_prev = null
			}
			if (di = TM.dataIndx) {
				column = columns[di];
				column._render = self.renderCell(self, TM);
				self.di_prev = di
			}
		},
		_showHideRows: function(p_data, _data, _hide) {
			var self = this,
				idstr = self.id,
				state = self.nodeClose,
				stateKey, stateClose, data = _data || self.getRoots(),
				childstr = self.childstr,
				rd, hidec, hide = _hide || false,
				children, len = data.length,
				i = 0;
			for (; i < len; i++) {
				rd = data[i];
				if (!rd.pq_filter) rd.pq_hidden = hide;
				if (children = rd[childstr]) {
					if (state) {
						stateKey = rd[idstr];
						stateClose = state[stateKey];
						if (stateClose != null) {
							delete state[stateKey];
							rd.pq_close = stateClose
						}
					}
					hidec = hide || rd.pq_close;
					self._showHideRows(p_data, children, hidec)
				}
			}
		},
		showHideRows: function() {
			var self = this,
				that = self.that,
				i = 0,
				parent, data = that.get_p_data(),
				len, rd, summary = self.Model.summary;
			self._showHideRows(data);
			if (summary) {
				data = that.pdata;
				len = data.length;
				for (; i < len; i++) {
					rd = data[i];
					if (rd.pq_gsummary && (parent = self.getParent(rd))) {
						rd.pq_hidden = parent.pq_hidden
					}
				}
			}
		},
		toggleNode: function(rd, evt) {
			this[rd.pq_close ? "expandNodes" : "collapseNodes"]([rd], evt)
		}
	})
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		fn = _pq.pqGrid.prototype,
		cRows = function(that) {
			this.that = that;
			var o = that.options;
			this.options = o;
			this.selection = [];
			this.hclass = " pq-state-select " + (o.bootstrap.on ? "" : "ui-state-highlight")
		};
	_pq.cRows = cRows;
	fn.SelectRow = function() {
		return this.iRows
	};
	cRows.prototype = {
		_add: function(row, remove) {
			var that = this.that,
				$tr, rowIndxPage = row.rowIndxPage,
				add = !remove,
				rowData = row.rowData,
				inView = this.inViewRow(rowIndxPage);
			if (!rowData.pq_hidden && inView) {
				$tr = that.getRow(row);
				if ($tr.length) {
					$tr[add ? "addClass" : "removeClass"](this.hclass);
					!add && $tr.removeAttr("tabindex")
				}
			}
			rowData.pq_rowselect = add;
			return row
		},
		_data: function(ui) {
			ui = ui || {};
			var that = this.that,
				all = ui.all,
				offset = that.riOffset,
				ri = all ? 0 : offset,
				data = that.get_p_data(),
				len = all ? data.length : that.pdata.length,
				end = ri + len;
			return [data, ri, end]
		},
		add: function(objP) {
			var rows = objP.addList = objP.rows || [{
				rowIndx: objP.rowIndx
			}];
			if (objP.isFirst) {
				this.setFirst(rows[0].rowIndx)
			}
			this.update(objP)
		},
		extend: function(objP) {
			var r2 = objP.rowIndx,
				arr = [],
				i, item, begin, end, r1 = this.getFirst(),
				isSelected;
			if (r1 != null) {
				isSelected = this.isSelected({
					rowIndx: r1
				});
				if (isSelected == null) {
					return
				}
				if (r1 > r2) {
					r1 = [r2, r2 = r1][0];
					begin = r1;
					end = r2 - 1
				} else {
					begin = r1 + 1;
					end = r2
				}
				for (i = begin; i <= end; i++) {
					item = {
						rowIndx: i
					};
					arr.push(item)
				}
				this.update(isSelected ? {
					addList: arr
				} : {
					deleteList: arr
				})
			}
		},
		getFirst: function() {
			return this._firstR
		},
		getSelection: function() {
			var that = this.that,
				data = that.get_p_data(),
				rd, i = 0,
				len = data.length,
				rows = [];
			for (; i < len; i++) {
				rd = data[i];
				if (rd && rd.pq_rowselect) {
					rows.push({
						rowIndx: i,
						rowData: rd
					})
				}
			}
			return rows
		},
		inViewCol: function(ci) {
			var that = this.that,
				options = that.options,
				iR = that.iRenderB,
				fc = options.freezeCols;
			if (ci < fc) {
				return true
			}
			return ci >= iR.initH && ci <= iR.finalH
		},
		inViewRow: function(rowIndxPage) {
			var that = this.that,
				options = that.options,
				iR = that.iRenderB,
				freezeRows = options.freezeRows;
			if (rowIndxPage < freezeRows) {
				return true
			}
			return rowIndxPage >= iR.initV && rowIndxPage <= iR.finalV
		},
		isSelected: function(objP) {
			var rowData = objP.rowData || this.that.getRowData(objP);
			return rowData ? rowData.pq_rowselect === true : null
		},
		isSelectedAll: function(ui) {
			var arr = this._data(ui),
				data = arr[0],
				ri = arr[1],
				end = arr[2],
				rd;
			for (; ri < end; ri++) {
				rd = data[ri];
				if (rd && !rd.pq_rowselect) {
					return false
				}
			}
			return true
		},
		removeAll: function(ui) {
			this.selectAll(ui, true)
		},
		remove: function(objP) {
			var rows = objP.deleteList = objP.rows || [{
				rowIndx: objP.rowIndx
			}];
			if (objP.isFirst) {
				this.setFirst(rows[0].rowIndx)
			}
			this.update(objP)
		},
		replace: function(ui) {
			ui.deleteList = this.getSelection();
			this.add(ui)
		},
		selectAll: function(_ui, remove) {
			var that = this.that,
				rd, rows = [],
				offset = that.riOffset,
				arr = this._data(_ui),
				data = arr[0],
				ri = arr[1],
				end = arr[2];
			for (; ri < end; ri++) {
				rd = data[ri];
				if (rd) {
					rows.push({
						rowIndx: ri,
						rowIndxPage: ri - offset,
						rowData: rd
					})
				}
			}
			this.update(remove ? {
				deleteList: rows
			} : {
				addList: rows
			}, true)
		},
		setFirst: function(v) {
			this._firstR = v
		},
		toRange: function() {
			var areas = [],
				that = this.that,
				data = that.get_p_data(),
				rd, i = 0,
				len = data.length,
				r1, r2;
			for (; i < len; i++) {
				rd = data[i];
				if (rd.pq_rowselect) {
					if (r1 != null) {
						r2 = i
					} else {
						r1 = r2 = i
					}
				} else if (r1 != null) {
					areas.push({
						r1: r1,
						r2: r2
					});
					r1 = r2 = null
				}
			}
			if (r1 != null) {
				areas.push({
					r1: r1,
					r2: r2
				})
			}
			return that.Range(areas)
		},
		toggle: function(ui) {
			this[this.isSelected(ui) ? "remove" : "add"](ui)
		},
		toggleAll: function(ui) {
			this[this.isSelectedAll(ui) ? "removeAll" : "selectAll"](ui)
		},
		update: function(objP, normalized) {
			var self = this,
				that = self.that,
				ui = {
					source: objP.source
				},
				norm = function(list) {
					return normalized ? list : that.normalizeList(list)
				},
				addList = norm(objP.addList || []),
				deleteList = norm(objP.deleteList || []);
			addList = addList.filter(function(rObj) {
				return self.isSelected(rObj) === false
			});
			deleteList = deleteList.filter(self.isSelected.bind(self));
			if (addList.length || deleteList.length) {
				ui.addList = addList;
				ui.deleteList = deleteList;
				if (that._trigger("beforeRowSelect", null, ui) === false) {
					return
				}
				ui.addList.forEach(function(rObj) {
					self._add(rObj)
				});
				ui.deleteList.forEach(function(rObj) {
					self._add(rObj, true)
				});
				that._trigger("rowSelect", null, ui)
			}
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iImport = new cImport(grid)
	});
	_pq.pqGrid.prototype.importWb = function(obj) {
		return this.iImport.importWb(obj)
	};
	var cImport = _pq.cImport = function(that) {
		this.that = that
	};
	cImport.prototype = {
		fillRows: function(data, i, obj) {
			var j = data.length;
			for (; j < i; j++) {
				data.push(obj ? {} : [])
			}
		},
		generateCols: function(numCols, columns, CMrow) {
			var CM = [],
				i = 0,
				column1, column2, indx = 0,
				colWidthDefault = pq.excel.colWidth,
				cells = CMrow ? CMrow.cells : [],
				titles = [];
			cells.forEach(function(cell, i) {
				var indx = cell.indx || i;
				titles[indx] = cell.value
			});
			columns = columns || [];
			columns.forEach(function(col, i) {
				indx = col.indx || i;
				CM[indx] = col
			});
			numCols = Math.max(numCols, columns.length, indx + 1);
			for (; i < numCols; i++) {
				column1 = CM[i] || {};
				column2 = {
					_title: titles[i] || "",
					title: this._render,
					width: column1.width || colWidthDefault,
					style: {},
					halign: "center"
				};
				this.copyStyle(column1, column2, column2.style);
				column1.hidden && (column2.hidden = true);
				CM[i] = column2
			}
			return CM
		},
		_render: function(ui) {
			return ui.column._title || pq.toLetter(ui.colIndx)
		},
		importS: function(sheet, extraRows, extraCols, keepCM, headerRowIndx) {
			var mergeCells = sheet.mergeCells,
				self = this,
				data = [],
				options = {},
				that = self.that,
				numCols = 0,
				rows = sheet.rows || [],
				frozenRows = sheet.frozenRows || 0,
				len = rows.length,
				i = 0,
				row, rindx, rd, cindx, di, CMrow, prop = "pq_cellprop",
				prop2, style = "pq_cellstyle",
				style2, attr = "pq_cellattr",
				attr2, rowstyle, rowprop, tmp, propObj, styleObj, CM = that.colModel,
				hriOffset = 0,
				formula, CMExists = CM && CM.length,
				shiftRC = _pq.cFormulas.shiftRC();
			if (headerRowIndx != null) {
				hriOffset = headerRowIndx + 1;
				CMrow = rows[headerRowIndx];
				rows = rows.slice(hriOffset);
				frozenRows = frozenRows - hriOffset;
				frozenRows = frozenRows > 0 ? frozenRows : 0
			}
			for (i = 0, len = rows.length; i < len; i++) {
				row = rows[i];
				rindx = row.indx || i;
				rd = {};
				prop2 = rd[prop] = {};
				style2 = rd[style] = {};
				attr2 = rd[attr] = {};
				rowstyle = rd.pq_rowstyle = {};
				rowprop = rd.pq_rowprop = {};
				self.copyStyle(row, rowprop, rowstyle);
				if (rindx != i) {
					self.fillRows(data, rindx, true)
				}(row.cells || []).forEach(function(cell, j) {
					cindx = cell.indx || j;
					di = keepCM && CMExists && CM[cindx] ? CM[cindx].dataIndx : cindx;
					rd[di] = cell.value;
					propObj = prop2[di] = {};
					styleObj = style2[di] = {};
					self.copyStyle(cell, propObj, styleObj);
					if (tmp = cell.comment) attr2[di] = {
						title: tmp
					};
					cell.format && self.copyFormat(rd, di, cell.format);
					formula = cell.formula;
					if (formula) {
						self.copyFormula(rd, di, hriOffset ? shiftRC(formula, 0, -hriOffset) : formula)
					}
					numCols <= cindx && (numCols = cindx + 1)
				});
				if (row.htFix >= 0) {
					rd.pq_ht = row.htFix;
					rd.pq_htfix = true
				}
				row.hidden && (rd.pq_hidden = true);
				data[rindx] = rd
			}
			options.title = sheet.name;
			extraRows && self.fillRows(data, data.length + extraRows, true);
			options.dataModel = {
				data: data
			};
			numCols += extraCols || 0;
			if (!keepCM && numCols) {
				options.colModel = self.generateCols(numCols, sheet.columns, CMrow)
			}
			options.mergeCells = (mergeCells || []).map(function(mc) {
				var add = pq.getAddress(mc);
				add.r1 -= hriOffset;
				add.r2 -= hriOffset;
				return add
			}).filter(function(mc) {
				return mc.r1 >= 0
			});
			options.freezeRows = frozenRows;
			options.freezeCols = sheet.frozenCols;
			options.pics = sheet.pics;
			return options
		},
		copyFormula: function(rd, di, formula) {
			var pq_fn = rd.pq_fn = rd.pq_fn || {};
			pq_fn[di] = formula
		},
		copyFormat: function(rd, di, format) {
			var pq_format = rd.pq_cellprop;
			pq_format = pq_format[di] = pq_format[di] || {};
			format = pq.isDateFormat(format) ? pq.excelToJui(format) : pq.excelToNum(format);
			pq_format.format = format
		},
		copyStyle: function(cell, prop, style) {
			var tmp, key, obj;
			(tmp = cell.font) && (style["font-family"] = tmp);
			(tmp = cell.fontSize) && (style["font-size"] = tmp + "px");
			(tmp = cell.color) && (style.color = tmp);
			(tmp = cell.bgColor) && (style["background-color"] = tmp);
			tmp = cell.bold;
			if (tmp != null) style["font-weight"] = tmp ? "bold" : "normal";
			cell.italic && (style["font-style"] = "italic");
			cell.underline && (style["text-decoration"] = "underline");
			cell.wrap && (style["white-space"] = "normal");
			(tmp = cell.align) && (prop.align = tmp);
			(tmp = cell.valign) && (prop.valign = tmp);
			if (tmp = cell.border)
				for (key in tmp) {
					obj = tmp[key];
					style["border-" + key] = obj
				}
		},
		applyOptions: function(main, options) {
			var DM = main.options.dataModel,
				DM2 = options.dataModel;
			if (DM2) {
				for (var key in DM2) {
					DM[key] = DM2[key]
				}
				delete options.dataModel
			}
			main.option(options)
		},
		importWb: function(obj) {
			var w = obj.workbook,
				activeId = w.activeId || 0,
				self = this,
				Tab = self.that.iTab,
				tabs = Tab.tabs(),
				main = Tab.main(),
				sheet = obj.sheet,
				s, op = function(s) {
					return self.importS(s, obj.extraRows, obj.extraCols, obj.keepCM, obj.headerRowIndx)
				},
				fn = function(options) {
					self.applyOptions(main, options)
				};
			if (tabs) {
				Tab.clear();
				w.sheets.forEach(function(_sheet, i) {
					var tab = {
						sheet: _sheet,
						extraRows: obj.extraRows,
						extraCols: obj.extraCols,
						name: _sheet.name,
						hidden: _sheet.hidden
					};
					tabs.push(tab);
					if (i == activeId) {
						tab._inst = main;
						fn(op(_sheet))
					}
				});
				Tab.model.activeId = activeId;
				main.element.show();
				Tab.refresh()
			} else {
				sheet = sheet || 0;
				s = w.sheets.filter(function(_sheet, i) {
					return sheet == i || sheet && sheet == _sheet.name
				})[0];
				if (s) {
					fn(op(s))
				}
			}
			main._trigger("importWb");
			main.refreshDataAndView()
		}
	}
})(jQuery);
(function($) {
	pq.excelImport = {
		attr: function() {
			var re = new RegExp('([a-z]+)\\s*=\\s*"([^"]*)"', "gi");
			return function(str) {
				str = str || "";
				str = str.slice(0, str.indexOf(">"));
				var attrs = {};
				str.replace(re, function(a, b, c) {
					attrs[b] = c
				});
				return attrs
			}
		}(),
		getComment: function(indx) {
			var self = this,
				commentObj = {},
				$sheetrel = self.pxml("xl/worksheets/_rels/sheet" + indx + ".xml.rels");
			if ($sheetrel.length) {
				var target = $($sheetrel.find('Relationship[Type*="/comments"]')[0]).attr("Target");
				if (target) {
					target = target.split("/").pop();
					var $c = self.getFileText("xl/" + target),
						comments = $c.match(/<comment\s+[^>]*>([\s\S]*?)<\/comment>/g) || [];
					comments.forEach(function(c) {
						var key = self.attr(c).ref,
							arr = c.match(/<t(\s+[^>]*)?>([\s\S]*?)(?=<\/t>)/g),
							val = self.match(arr[arr.length - 1], /[^>]*>([\s\S]*)/, 1);
						commentObj[key] = $.trim(val)
					})
				}
			}
			return commentObj
		},
		getBase64: function(zipObject) {
			var base64 = JSZip.base64.encode(zipObject.asBinary());
			return "data:image/png;base64," + base64
		},
		pxml: function(path) {
			return $($.parseXML(this.getFileText(path)))
		},
		getPic: function($sheet, indx) {
			var self = this,
				key, pics = [],
				files = self.files,
				drwId = self.match($sheet, /<drawing\s+r:id=\"([^\"]*)\"(\s*)\/>/i, 1);
			if (drwId) {
				var $sheetrel = self.pxml("xl/worksheets/_rels/sheet" + indx + ".xml.rels"),
					drawing = $($sheetrel.find('Relationship[Id="' + drwId + '"]')[0]).attr("Target"),
					drawing = drawing.split("/").pop(),
					fname, objFNames = {},
					$r, objSrc = {},
					factor = 9500,
					div, $draw = self.pxml("xl/drawings/" + drawing),
					$rel = self.pxml("xl/drawings/_rels/" + drawing + ".rels"),
					arr = ["col", "colOff", "row", "rowOff"];
				$rel.find("Relationship[Type*='/image']").each(function(i, r) {
					$r = $(r);
					objFNames[$r.attr("Id")] = $r.attr("Target").match(/media\/(.*)/)[1]
				});
				for (key in files) {
					if (/media\/.*/.test(key)) {
						fname = key.match(/media\/(.*)/)[1];
						objSrc[fname] = self.getBase64(files[key])
					}
				}
				$draw.find("xdr\\:twoCellAnchor,xdr\\:oneCellAnchor").each(function(i, pic) {
					var $pic = $(pic),
						cnvpr = $pic.find("xdr\\:cNvPr"),
						oname = cnvpr.attr("descr"),
						id = cnvpr.attr("id"),
						rid = $pic.find("a\\:blip").attr("r:embed"),
						fname = objFNames[rid],
						$from = $pic.find("xdr\\:from"),
						$to = $pic.find("xdr\\:to"),
						$ext = $pic.find("xdr\\:ext"),
						toLen = $to.length,
						from = [],
						to = toLen ? [] : null;
					arr.forEach(function(col, j) {
						div = j % 2 ? factor : 1;
						from.push($from.find("xdr\\:" + col).text() / div);
						toLen && to.push($to.find("xdr\\:" + col).text() / div)
					});
					pics.push({
						id: id,
						name: oname,
						src: objSrc[fname],
						from: from,
						to: to,
						cx: toLen ? 0 : $ext.attr("cx") / factor,
						cy: toLen ? 0 : $ext.attr("cy") / factor
					})
				})
			}
			return pics
		},
		cacheTheme: function() {
			var self = this,
				$doc = $($.parseXML(self.getFileTextFromKey("th"))),
				$a = $doc.find("a\\:clrScheme"),
				$aa = $a.children(),
				arr = self.themeColor = [];
			$aa.each(function(i, a) {
				var val = $(a).children().attr("val");
				arr[i] = val
			})
		},
		cacheStyles: function() {
			var self = this,
				fontSizeDefault, fontDefault, format, $styles = $($.parseXML(self.getStyleText())),
				formats = $.extend(true, {}, self.preDefFormats),
				styles = [],
				fonts = [""],
				fills = ["", ""],
				borders = [];
			$styles.find("numFmts>numFmt").each(function(i, numFmt) {
				var $numFmt = $(numFmt),
					f = $numFmt.attr("formatCode");
				formats[$numFmt.attr("numFmtId")] = f
			});
			$styles.find("fills>fill>patternFill>fgColor[rgb]").each(function(i, fgColor) {
				var color = self.getColor($(fgColor).attr("rgb"));
				fills.push(color)
			});
			$styles.find("borders>border").each(function(i, b) {
				var $b = $(b).children(),
					bb = {},
					double = "double";
				$b.each(function(j, bl) {
					var $bl = $(bl),
						style, $c = $bl.children(),
						theme = $c.attr("theme"),
						color = theme ? "00" + self.themeColor[theme] : 0;
					if ($c.length) {
						style = $bl.attr("style");
						bb[bl.tagName] = (style == double ? "3px" : "1px") + " " + (style == double ? double : "solid") + " " + self.getColor($c.attr("rgb") || color || "00000000")
					}
				});
				borders.push(bb)
			});
			$styles.find("fonts>font").each(function(i, font) {
				var $font = $(font),
					fontSize = $font.find("sz").attr("val") * 1,
					_font = $font.find("name").attr("val"),
					color = $font.find("color").attr("rgb"),
					fontObj = {};
				if (i === 0) {
					fontSizeDefault = fontSize;
					fontDefault = _font.toUpperCase();
					return
				}
				if ($font.find("b").length) fontObj.bold = true;
				if (color) fontObj.color = self.getColor(color);
				if (_font && _font.toUpperCase() != fontDefault) fontObj.font = _font;
				if (fontSize && fontSize != fontSizeDefault) fontObj.fontSize = fontSize;
				if ($font.find("u").length) fontObj.underline = true;
				if ($font.find("i").length) fontObj.italic = true;
				fonts.push(fontObj)
			});
			$styles.find("cellXfs>xf").each(function(i, xf) {
				var $xf = $(xf),
					numFmtId = $xf.attr("numFmtId") * 1,
					fillId = $xf.attr("fillId") * 1,
					borderId = $xf.attr("borderId") * 1,
					$align = $xf.children("alignment"),
					align, valign, wrap, fontId = $xf.attr("fontId") * 1,
					key, fontObj = fontId ? fonts[fontId] : {},
					style = {};
				if ($align.length) {
					align = $align.attr("horizontal");
					align && (style.align = align);
					valign = $align.attr("vertical");
					valign && (style.valign = valign);
					wrap = $align.attr("wrapText");
					wrap == "1" && (style.wrap = true)
				}
				if (numFmtId) {
					format = formats[numFmtId];
					if (/(?=.*m.*)(?=.*d.*)(?=.*y.*)/i.test(format)) {
						format = format.replace(/(\[.*\]|[^mdy\/\-\s])/gi, "")
					}
					style.format = format
				}
				if (borderId) {
					style.border = borders[borderId]
				}
				if (fillId && fills[fillId]) {
					style.bgColor = fills[fillId]
				}
				for (key in fontObj) {
					style[key] = fontObj[key]
				}
				styles.push(style)
			});
			self.getStyle = function(s) {
				return styles[s]
			};
			$styles = 0
		},
		getMergeCells: function($sheet) {
			var self = this,
				mergeCells = $sheet.match(/<mergeCell\s+.*?(\/>|<\/mergeCell>)/g) || [];
			return mergeCells.map(function(mc) {
				return self.attr(mc).ref
			})
		},
		getFrozen: function($sheet) {
			var $pane = this.match($sheet, /<pane.*?(\/>|<\/pane>)/, 0),
				attr = this.attr($pane),
				xSplit = attr.xSplit * 1,
				ySplit = attr.ySplit * 1;
			return {
				r: ySplit || 0,
				c: xSplit || 0
			}
		},
		getFormula: function(self) {
			var obj = {},
				shiftRC = $.paramquery.cFormulas.shiftRC();
			return function(children, ri, ci) {
				if (children.substr(0, 2) === "<f") {
					var f = self.match(children, /^<f.*?>(.*?)<\/f>/, 1),
						obj2, attr = self.attr(children);
					if (attr.t == "shared") {
						if (f) {
							obj[attr.si] = {
								r: ri,
								c: ci,
								f: f
							}
						} else {
							obj2 = obj[attr.si];
							f = shiftRC(obj2.f, ci - obj2.c, ri - obj2.r)
						}
					}
					return f
				}
			}
		},
		getCols: function($sheet) {
			var self = this,
				dim = ($sheet.match(/<dimension\s.*?\/>/) || [])[0],
				ref = self.attr(dim || "").ref,
				cols = [],
				$cols = $sheet.match(/<col\s.*?\/>/g) || [],
				c2 = ref ? pq.getAddress(ref).c2 + 1 : $cols.length,
				factor = pq.excel.colRatio;
			for (var j = 0; j < c2; j++) {
				var col = $cols[j],
					attrs = self.attr(col),
					min = attrs.min * 1,
					max = attrs.max * 1,
					hidden = attrs.hidden * 1,
					width = attrs.width * 1,
					_col, s = attrs.style,
					style = s ? self.getStyle(s) : {},
					key;
				for (var i = min; i <= max; i++) {
					_col = {};
					if (hidden) _col.hidden = true;
					else _col.width = (width * factor).toFixed(2) * 1;
					if (i !== cols.length + 1) _col.indx = i - 1;
					for (key in style) _col[key] = style[key];
					cols.push(_col)
				}
			}
			return cols
		},
		getColor: function(color) {
			return "#" + color.slice(2)
		},
		getPath: function(key) {
			return this.paths[key]
		},
		getPathSheets: function() {
			return this.pathSheets
		},
		getFileTextFromKey: function(key) {
			return this.getFileText(this.getPath(key))
		},
		getFileText: function(path) {
			var file;
			if (path) {
				file = this.files[path.replace(/^\//, "")];
				return file ? file.asText() : ""
			} else {
				return ""
			}
		},
		getSheetText: function(sheetNameOrIndx) {
			sheetNameOrIndx = sheetNameOrIndx || 0;
			var path = this.pathSheets.filter(function(path, i) {
				return path.name === sheetNameOrIndx || i === sheetNameOrIndx
			})[0].path;
			return this.getFileText(path)
		},
		getStyleText: function() {
			return this.getFileTextFromKey("st")
		},
		getSI: function(str) {
			var si = [],
				arr, unescapeXml = pq.unescapeXml,
				count = this.attr(this.match(str, /<sst.*?>[\s\S]*?<\/sst>/, 0)).uniqueCount * 1;
			str.replace(/<si>([\s\S]*?)<\/si>/g, function(a, b) {
				arr = [];
				b.replace(/<t.*?>([\s\S]*?)<\/t>/g, function(c, d) {
					arr.push(d)
				});
				si.push(unescapeXml(arr.join("")))
			});
			if (count && count !== si.length) {
				throw "si misatch"
			}
			return si
		},
		getCsv: function(text, separator) {
			var arr = [],
				rnd = Math.random() + "",
				separator;
			text = text.replace("\ufeff", "").replace(/(?:^|[^"]+)"(([^"]|"{2})+)"(?=([^"]+|$))/g, function(a, b) {
				var indx = a.indexOf(b);
				arr.push(b.replace(/""/g, '"'));
				return a.slice(0, indx - 1) + rnd + (arr.length - 1) + rnd
			});
			separator = separator || new RegExp(text.indexOf("	") == -1 ? "," : "	", "g");
			return {
				sheets: [{
					rows: text.split(/\r\n|\r|\n/g).map(function(row) {
						return {
							cells: row.split(separator).map(function(cell) {
								if (cell.indexOf(rnd) == 0) {
									var i = cell.slice(rnd.length, cell.indexOf(rnd, 1));
									cell = arr[i]
								} else if (cell === '""') cell = "";
								return {
									value: cell
								}
							})
						}
					})
				}]
			}
		},
		getWorkBook: function(buffer, type, sheets1) {
			var self = this,
				typeObj = {};
			if (type) typeObj[type] = true;
			else if (typeof buffer == "string") typeObj.base64 = true;
			self.files = new JSZip(buffer, typeObj).files;
			self.readPaths();
			self.cacheTheme();
			self.cacheStyles();
			var pathSS = this.getPath("ss"),
				sheets = [],
				si = pathSS ? this.getSI(this.getFileText(pathSS)) : [];
			self.getPathSheets().forEach(function(obj, i) {
				if (!sheets1 || sheets1.indexOf(i) > -1 || sheets1.indexOf(obj.name) > -1) {
					var $sheet = self.getFileText(obj.path),
						$sheetData = self.match($sheet, /<sheetData.*?>([\s\S]*?)<\/sheetData>/, 1),
						s = self.getWorkSheet($sheet, $sheetData, si, obj.name, i + 1);
					if (obj.hidden) s.hidden = true;
					sheets.push(s)
				}
			});
			delete self.files;
			return {
				sheets: sheets,
				activeId: self.activeId
			}
		},
		getWorkSheet: function($sheet, $sheetData, si, sheetName, indx) {
			var self = this,
				key, cell, f, format, cell2, comments = self.getComment(indx),
				data = [],
				rd, cells, t, s, v, cr, num_cols = 0,
				ci, cell_children, rattr, cattr, toNumber = pq.toNumber,
				getFormula = self.getFormula(self),
				tmp, formulas = pq.formulas,
				isDateFormat = pq.isDateFormat,
				mc = self.getMergeCells($sheet),
				rows = $sheetData.match(/<row[^<]*?\/>|<row.*?<\/row>/g) || [],
				columns = self.getCols($sheet),
				colObj = {},
				column, row, r, rowr, style, i = 0,
				rowsLen = rows.length;
			columns.forEach(function(col, i) {
				colObj[col.indx || i] = col
			});
			for (; i < rowsLen; i++) {
				rd = {
					cells: []
				};
				row = rows[i];
				rattr = self.attr(row);
				rowr = rattr.r;
				if (rattr.customHeight) {
					rd.htFix = rattr.ht * 1.5
				}
				s = rattr.s;
				style = s ? self.getStyle(s) : {};
				for (key in style) {
					rd[key] = style[key]
				}
				r = rowr ? rowr - 1 : i;
				r !== i && (rd.indx = r);
				rattr.hidden && (rd.hidden = true);
				cells = row.match(/(<c[^<]*?\/>|<c.*?<\/c>)/g) || [];
				for (var j = 0, cellsLen = cells.length; j < cellsLen; j++) {
					cell = cells[j];
					cattr = self.attr(cell);
					t = cattr.t;
					cell_children = self.match(cell, /<c.*?>(.*?)(<\/c>)?$/, 1);
					cell2 = {};
					if (t == "inlineStr") {
						v = cell_children.match(/<t><!\[CDATA\[(.*?)\]\]><\/t>/)[1]
					} else {
						v = self.match(cell_children, /<v>(.*?)<\/v>/, 1) || undefined;
						if (v != null) {
							if (t == "s") {
								v = si[v]
							} else if (t == "str") {
								v = pq.unescapeXml(v)
							} else if (t == "b") {
								v = v == "1"
							} else {
								v = formulas.VALUE(v)
							}
						}
					}
					cr = cattr.r;
					if (cr) {
						ci = cr.replace(/\d+/, "");
						ci = toNumber(ci)
					} else {
						ci = j;
						cr = pq.toLetter(ci) + (r + 1)
					}
					if (comments[cr]) {
						cell2.comment = comments[cr]
					}
					num_cols = num_cols > ci ? num_cols : ci;
					v !== undefined && (cell2.value = v);
					ci !== j && (cell2.indx = ci);
					f = getFormula(cell_children, r, ci);
					f && (cell2.formula = pq.unescapeXml(f));
					s = cattr.s;
					column = colObj[ci];
					if (s && (s = this.getStyle(s))) {
						for (key in s) {
							tmp = s[key];
							if (!column || column[key] != tmp)
								if (rd[key] != tmp) cell2[key] = tmp
						}
						format = cell2.format;
						if (v != null && !f && format && isDateFormat(format)) {
							cell2.value = formulas.TEXT(v, "m/d/yyyy")
						}
					}["bold", "underline", "italic"].forEach(function(key) {
						if (s == null || s[key] == null) {
							if ((column || {})[key] || rd[key]) {
								cell2[key] = false
							}
						}
					});
					rd.cells.push(cell2)
				}
				data.push(rd)
			}
			var sheetData = {
					rows: data,
					name: sheetName,
					pics: self.getPic($sheet, indx)
				},
				frozen = self.getFrozen($sheet);
			mc.length && (sheetData.mergeCells = mc);
			columns.length && (sheetData.columns = columns);
			frozen.r && (sheetData.frozenRows = frozen.r);
			frozen.c && (sheetData.frozenCols = frozen.c);
			return sheetData
		},
		Import: function(obj, fn) {
			var self = this,
				file = obj.file,
				content = obj.content,
				url = obj.url,
				csv = (url || (file || {}).name || "").slice(-3).toLowerCase() == "csv" || obj.csv,
				cb = function(data, type2) {
					fn(self[csv ? "getCsv" : "getWorkBook"](data, csv ? obj.separator : obj.type || type2, obj.sheets))
				};
			if (url) {
				url += "?" + Math.random();
				if (!window.Uint8Array) {
					JSZipUtils.getBinaryContent(url, function(err, data) {
						cb(data, "binary")
					})
				} else {
					pq.xmlhttp(url, csv ? "text" : "arraybuffer", cb)
				}
			} else if (file) {
				pq.fileRead(file, csv ? "readAsText" : "readAsArrayBuffer", cb)
			} else if (content) {
				cb(content)
			}
		},
		match: function(str, re, indx) {
			var m = str.match(re);
			return m ? m[indx] : ""
		},
		preDefFormats: {
			1: "0",
			2: "0.00",
			3: "#,##0",
			4: "#,##0.00",
			5: "$#,##0_);($#,##0)",
			6: "$#,##0_);[Red]($#,##0)",
			7: "$#,##0.00_);($#,##0.00)",
			8: "$#,##0.00_);[Red]($#,##0.00)",
			9: "0%",
			10: "0.00%",
			11: "0.00E+00",
			12: "# ?/?",
			13: "# ??/??",
			14: "m/d/yyyy",
			15: "d-mmm-yy",
			16: "d-mmm",
			17: "mmm-yy",
			18: "h:mm AM/PM",
			19: "h:mm:ss AM/PM",
			20: "h:mm",
			21: "h:mm:ss",
			22: "m/d/yyyy h:mm",
			37: "#,##0_);(#,##0)",
			38: "#,##0_);[Red](#,##0)",
			39: "#,##0.00_);(#,##0.00)",
			40: "#,##0.00_);[Red](#,##0.00)",
			45: "mm:ss",
			46: "[h]:mm:ss",
			47: "mm:ss.0",
			48: "##0.0E+0",
			49: "@"
		},
		readPaths: function() {
			var self = this,
				files = self.files,
				$ContentType = $($.parseXML(files["[Content_Types].xml"].asText())),
				key, paths = self.paths = {
					wb: "sheet.main",
					ws: "worksheet",
					st: "styles",
					ss: "sharedStrings",
					th: "theme"
				};
			for (key in paths) {
				paths[key] = $ContentType.find('[ContentType$="' + paths[key] + '+xml"]').attr("PartName")
			}
			for (key in files) {
				if (/workbook.xml.rels$/.test(key)) {
					paths["wbrels"] = key;
					break
				}
			}
			var $wbrels = $(self.getFileTextFromKey("wbrels")),
				$w = $(self.getFileTextFromKey("wb")),
				pathSheets = self.pathSheets = [];
			self.activeId = $w.find("workbookView").attr("activeTab") * 1 || null;
			$w.find("sheet").each(function(i, sheet) {
				var $sheet = $(sheet),
					rId = $sheet.attr("r:id"),
					name = $sheet.attr("name"),
					partial_path = $wbrels.find('[Id="' + rId + '"]').attr("Target"),
					full_path = $ContentType.find('Override[PartName$="' + partial_path + '"]').attr("PartName");
				pathSheets.push({
					name: name,
					rId: rId,
					path: full_path,
					hidden: $sheet.attr("state") == "hidden"
				})
			})
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		fn = _pq._pqGrid.prototype;
	fn.exportExcel = function(obj) {
		obj = obj || {};
		obj.format = "xlsx";
		return this.exportData(obj)
	};
	fn.exportCsv = function(obj) {
		obj = obj || {};
		obj.format = "csv";
		return this.exportData(obj)
	};
	fn.exportData = function(obj) {
		var e = new cExport(this, obj);
		return e.Export(obj)
	};
	var cExport = _pq.cExport = function(that) {
		this.that = that
	};
	cExport.prototype = $.extend({
		copyStyle: function(cell, style, prop, colStyle, colProp) {
			colStyle = colStyle || {};
			colProp = colProp || {};
			var tmp, s = function(key) {
					var s = style[key];
					if (s && colStyle[key] != s) return s
				},
				p = function(key) {
					var s = prop[key];
					if (s && colProp[key] != s) return s
				};
			if (style) {
				style = pq.styleObj(style);
				if (tmp = s("background-color")) cell.bgColor = tmp;
				if (tmp = s("font-size")) cell.fontSize = parseFloat(tmp);
				if (tmp = s("color")) cell.color = tmp;
				if (tmp = s("font-family")) cell.font = tmp;
				if (tmp = s("font-weight")) cell.bold = tmp == "bold";
				if (tmp = s("white-space")) cell.wrap = tmp == "normal";
				if (tmp = s("font-style")) cell.italic = tmp == "italic";
				if (tmp = s("text-decoration")) cell.underline = tmp == "underline";
				var B = s("border");
				["left", "right", "top", "bottom"].forEach(function(l) {
					var b, border;
					if ((b = s("border-" + l)) || (b = B)) {
						border = cell.border = cell.border || {};
						border[l] = b
					}
				})
			}
			if (prop) {
				if (tmp = p("align")) cell.align = tmp;
				if (tmp = p("valign")) cell.valign = tmp
			}
		},
		getCsvHeader: function(hc, hcLen, CM, separator) {
			var self = this,
				header = [],
				csvRows = [],
				column, cell, title;
			for (var i = 0; i < hcLen; i++) {
				var row = hc[i],
					laidCell = null;
				for (var ci = 0, lenj = row.length; ci < lenj; ci++) {
					column = CM[ci];
					if (column.hidden || column.copy === false) {
						continue
					}
					cell = row[ci];
					if (i > 0 && cell == hc[i - 1][ci]) {
						header.push("")
					} else if (laidCell && ci > 0 && cell == laidCell) {
						header.push("")
					} else {
						title = self.getTitle(cell, ci);
						title = title == null ? "" : (title + "").replace(/\"/g, '""');
						laidCell = cell;
						header.push('"' + title + '"')
					}
				}
				csvRows.push(header.join(separator));
				header = []
			}
			return csvRows
		},
		getCSVContent: function(obj, CM, CMLen, hc, hcLen, data, dataLen, remotePage, offset, iMerge, render, iGV, header) {
			var self = this,
				objM, objN, cv, i, j, separator = obj.separator || ",",
				objR, rowData, ri, rip, column, csvRows, response = [];
			csvRows = header ? self.getCsvHeader(hc, hcLen, CM, separator) : [];
			for (i = 0; i < dataLen; i++) {
				rowData = data[i];
				if (rowData.pq_hidden) {
					continue
				}
				ri = remotePage ? i + offset : i;
				rip = ri - offset;
				objR = {
					rowIndx: ri,
					rowIndxPage: rip,
					rowData: rowData,
					Export: true
				};
				for (var j = 0; j < CMLen; j++) {
					column = CM[j];
					if (!column.hidden && column.copy !== false) {
						objN = null;
						objM = null;
						if (iMerge.ismergedCell(ri, j)) {
							if (objM = iMerge.isRootCell(ri, j)) {
								objN = iMerge.getRootCellO(ri, j);
								objN.Export = true;
								cv = self.getRenderVal(objN, render, iGV)[0]
							} else {
								cv = ""
							}
						} else {
							objR.colIndx = j;
							objR.column = column;
							objR.dataIndx = column.dataIndx;
							cv = self.getRenderVal(objR, render, iGV)[0]
						}
						var cellData = (cv == null ? "" : cv) + "";
						cellData = cellData.replace(/\"/g, '""');
						response.push('"' + cellData + '"')
					}
				}
				csvRows.push(response.join(separator));
				response = []
			}
			return "\ufeff" + csvRows.join("\n")
		},
		getExportCM: function(CM, hcLen) {
			return hcLen > 1 ? CM : CM.filter(function(col) {
				return col.copy != false
			})
		},
		Export: function(obj) {
			var self = this,
				that = self.that,
				ret, tabModel = that.options.tabModel || {},
				tabs = tabModel.tabs,
				w = {
					sheets: []
				},
				sheet, instance, e;
			if (that._trigger("beforeExport", null, obj) === false) {
				return false
			}
			if (obj.format == "xlsx") {
				if (tabs) {
					tabs.forEach(function(tab, id) {
						if (instance = tab._inst || !(sheet = tab.sheet) && (instance = that.iTab.create(id))) {
							e = new cExport(instance);
							sheet = e._Export(obj).sheets[0];
							sheet.name = tab.name;
							if (tab.hidden) sheet.hidden = true
						}
						w.sheets.push(sheet)
					});
					w.activeId = tabModel.activeId
				} else {
					w = self._Export(obj)
				}
				if (that._trigger("workbookReady", null, {
						workbook: w
					}) === false) {
					return w
				}
				if (obj.workbook) {
					return w
				}
				obj.workbook = w;
				ret = pq.excel.exportWb(obj);
				ret = ret || self.postRequest(obj);
				that._trigger("exportData", null, obj);
				return ret
			}
			return self._Export(obj)
		},
		_Export: function(obj) {
			var self = this,
				that = self.that,
				o = that.options,
				ret, GM = o.groupModel,
				remotePage = o.pageModel.type == "remote",
				offset = that.riOffset,
				iGV = that.iRenderB,
				iMerge = that.iMerge,
				hc = that.headerCells,
				hcLen = hc.length,
				CM = that.colModel,
				CMLen = CM.length,
				CMR = self.getExportCM(CM, hcLen),
				CMRLen = CMR.length,
				TM = o.treeModel,
				curPage = GM.on && GM.dataIndx.length || remotePage || TM.dataIndx && TM.summary,
				data = curPage ? that.pdata : o.dataModel.data,
				data = o.summaryData ? data.concat(o.summaryData) : data,
				dataLen = data.length,
				render = obj.render,
				header = !obj.noheader,
				format = obj.format;
			if (format == "xlsx") {
				var w = self.getWorkbook(CMR, CMRLen, hc, hcLen, data, dataLen, remotePage, offset, iMerge, render, iGV, header, obj.sheetName);
				return w
			} else if (format == "json") {
				obj.data = self.getJsonContent(obj, data)
			} else if (format == "csv") {
				obj.data = self.getCSVContent(obj, CM, CMLen, hc, hcLen, data, dataLen, remotePage, offset, iMerge, render, iGV, header)
			} else {
				obj.data = self.getHtmlContent(obj, CM, CMLen, hc, hcLen, data, dataLen, remotePage, offset, iMerge, render, iGV, header)
			}
			ret = ret || self.postRequest(obj);
			that._trigger("exportData", null, obj);
			return ret
		},
		getHtmlHeader: function(hc, hcLen) {
			var self = this,
				header = ["<thead>"],
				cell, colspan, rowspan, title, align, i = 0;
			for (; i < hcLen; i++) {
				var row = hc[i],
					laidCell = null;
				header.push("<tr>");
				for (var ci = 0, lenj = row.length; ci < lenj; ci++) {
					cell = row[ci];
					colspan = cell.colSpan;
					if (cell.hidden || !colspan || cell.copy === false) {
						continue
					}
					rowspan = cell.rowSpan;
					if (i > 0 && cell == hc[i - 1][ci]) {} else if (laidCell && ci > 0 && cell == laidCell) {} else {
						title = self.getTitle(cell, ci);
						laidCell = cell;
						align = cell.halign || cell.align;
						align = align ? "align=" + align : "";
						header.push("<th colspan=", colspan, " rowspan=", rowspan, " ", align, ">", title, "</th>")
					}
				}
				header.push("</tr>")
			}
			header.push("</thead>");
			return header.join("")
		},
		getHtmlBody: function(CM, CMLen, data, dataLen, remotePage, offset, iMerge, render, iGV) {
			var self = this,
				response = [],
				i, j, column, objN, objM, arr, dstyle, objR, rowData, ri, rip, cellData, attr, align;
			for (i = 0; i < dataLen; i++) {
				rowData = data[i];
				if (rowData.pq_hidden) {
					continue
				}
				ri = remotePage ? i + offset : i;
				rip = ri - offset;
				objR = {
					rowIndx: ri,
					rowIndxPage: rip,
					rowData: rowData,
					Export: true
				};
				response.push("<tr>");
				for (j = 0; j < CMLen; j++) {
					column = CM[j];
					if (column.hidden || column.copy === false) {
						continue
					}
					objN = null;
					objM = null;
					attr = "";
					if (iMerge.ismergedCell(ri, j)) {
						if (objM = iMerge.isRootCell(ri, j)) {
							objN = iMerge.getRootCellO(ri, j);
							objN.Export = true;
							arr = self.getRenderVal(objN, render, iGV);
							cellData = arr[0];
							dstyle = arr[1]
						} else {
							continue
						}
						attr = "rowspan=" + objM.rowspan + " colspan=" + objM.colspan + " "
					} else {
						objR.colIndx = j;
						objR.column = column;
						objR.dataIndx = column.dataIndx;
						arr = self.getRenderVal(objR, render, iGV);
						cellData = arr[0];
						dstyle = arr[1]
					}
					align = column.align;
					attr += align ? "align=" + align : "";
					cellData = cellData == null ? "" : cellData;
					cellData = pq.newLine(cellData);
					response.push("<td ", attr, dstyle ? ' style="' + dstyle + '"' : "", ">", cellData, "</td>")
				}
				response.push("</tr>")
			}
			return response.join("")
		},
		getHtmlContent: function(obj, CM, CMLen, hc, hcLen, data, dataLen, remotePage, offset, iMerge, render, iGV, header) {
			var self = this,
				that = self.that,
				rtl = that.options.rtl,
				cssRules = obj.cssRules || "",
				$tbl = that.element.find(".pq-grid-table"),
				fontFamily = $tbl.css("font-family"),
				fontSize = $tbl.css("font-size"),
				styleTable = "table{empty-cells:show;font-family:" + fontFamily + ";font-size:" + fontSize + ";border-collapse:collapse;}",
				response = [];
			response.push("<!DOCTYPE html><html><head>", '<meta charset="utf-8" />', "<title>", obj.title || "ParamQuery Pro", "</title>", "</head><body ", rtl ? 'dir="rtl"' : "", " >", "<style>", styleTable, "td,th{padding: 5px;border:1px solid #ccc;}", cssRules, "</style>", "<table>");
			response.push(header ? self.getHtmlHeader(hc, hcLen, CM) : "");
			response.push(self.getHtmlBody(CM, CMLen, data, dataLen, remotePage, offset, iMerge, render, iGV));
			response.push("</table></body></html>");
			return response.join("")
		},
		getJsonContent: function(obj, data) {
			function replacer(key, val) {
				if ((key + "").indexOf("pq_") === 0) {
					return undefined
				}
				return val
			}
			return obj.nostringify ? data : JSON.stringify(data, obj.nopqdata ? replacer : null, obj.nopretty ? null : 2)
		},
		getXlsMergeCells: function(mc, hcLen, iMerge, dataLen) {
			mc = mc.concat(iMerge.getMergeCells(hcLen, this.curPage, dataLen));
			var mcs = [],
				toLetter = pq.toLetter,
				mcLen = mc.length;
			for (var i = 0; i < mcLen; i++) {
				var obj = mc[i];
				obj = toLetter(obj.c1) + (obj.r1 + 1) + ":" + toLetter(obj.c2) + (obj.r2 + 1);
				mcs.push(obj)
			}
			return mcs
		},
		getXlsCols: function(CM, CMLen) {
			var cols = [],
				col, column, width, i = 0,
				colWidthDefault = pq.excel.colWidth;
			for (; i < CMLen; i++) {
				column = CM[i];
				width = (column._width || colWidthDefault).toFixed(2) * 1;
				col = {};
				this.copyStyle(col, column.style, column);
				width !== colWidthDefault && (col.width = width);
				column.hidden && (col.hidden = true);
				if (!pq.isEmpty(col)) {
					cols.length !== i && (col.indx = i);
					cols.push(col)
				}
			}
			return cols
		},
		getXlsHeader: function(hc, hcLen, mc) {
			var self = this,
				rows = [];
			for (var i = 0; i < hcLen; i++) {
				var row = hc[i],
					cells = [];
				for (var ci = 0, lenj = row.length; ci < lenj; ci++) {
					var cell = row[ci];
					if (cell.copy === false) {
						continue
					}
					var colspan = cell.o_colspan,
						rowspan = cell.rowSpan,
						title = self.getTitle(cell, ci);
					if (i > 0 && cell == hc[i - 1][ci]) {
						title = ""
					} else if (ci > 0 && cell == hc[i][ci - 1]) {
						title = ""
					} else if (colspan > 1 || rowspan > 1) {
						mc.push({
							r1: i,
							c1: ci,
							r2: i + rowspan - 1,
							c2: ci + colspan - 1
						})
					}
					cells.push({
						value: title,
						bgColor: "#eeeeee"
					})
				}
				rows.push({
					cells: cells
				})
			}
			return rows
		},
		getXlsBody: function(CM, CMLen, data, dataLen, remotePage, offset, iMerge, render, iGV, shiftR, rowInit) {
			var self = this,
				that = self.that,
				o = that.options,
				mergeCell, i, j, cv, f, value, column, objR, arr, dstyle, dtitle, dprop, rows = [],
				cells, rowData, ri, rip, di, colStyle, colProp, rowprop, row, cell, cellattr, cellattrdi, tmp, cellprop, cellpropdi, cellstyle, cellstyledi, shiftRC = _pq.cFormulas.shiftRC(that),
				format;
			for (i = 0; i < dataLen; i++) {
				rowData = data[i];
				cellattr = rowData.pq_cellattr;
				cellprop = rowData.pq_cellprop || {};
				rowprop = rowData.pq_rowprop || {};
				cellstyle = rowData.pq_cellstyle || {};
				cells = [];
				ri = remotePage ? i + offset : i;
				rip = ri - offset;
				objR = {
					rowIndx: ri,
					rowIndxPage: rip,
					rowData: rowData,
					Export: true
				};
				for (j = 0; j < CMLen; j++) {
					column = CM[j];
					colStyle = column.style;
					colProp = column;
					di = column.dataIndx;
					cellstyledi = cellstyle[di];
					cellpropdi = cellprop[di] || {};
					value = rowData[di];
					cv = value;
					f = that.getFormula(rowData, di);
					mergeCell = false;
					if (iMerge.ismergedCell(ri, j)) {
						if (!iMerge.isRootCell(ri, j, "o")) {
							mergeCell = true
						}
					}
					if (!mergeCell && !f) {
						objR.colIndx = j;
						objR.column = column;
						objR.dataIndx = di;
						arr = self.getRenderVal(objR, render, iGV);
						cv = arr[0];
						dstyle = arr[1];
						dprop = arr[2];
						dtitle = arr[3]
					}
					format = o.format.call(that, rowData, column, cellpropdi, rowprop);
					cell = {};
					if (typeof format == "string") {
						if (pq.isDateFormat(format)) {
							if (cv !== value && $.datepicker.formatDate(format, new Date(value)) === cv) {
								cv = value
							}
							format = pq.juiToExcel(format)
						} else {
							if (cv !== value && pq.formatNumber(value, format) === cv) {
								cv = value
							}
							format = pq.numToExcel(format)
						}
						cell.format = format
					}
					cv !== undefined && (cell.value = cv);
					if (cellattr && (cellattrdi = cellattr[di])) {
						if (tmp = cellattrdi.title) cell.comment = tmp;
						if (tmp = cellattrdi.style) self.copyStyle(cell, tmp)
					}
					self.copyStyle(cell, cellstyledi, cellpropdi, colStyle, colProp);
					self.copyStyle(cell, dstyle, dprop, colStyle, colProp);
					if (dtitle) cell.comment = dtitle;
					if (f) {
						if (shiftR) {
							f = shiftRC(f, 0, shiftR)
						}
						cell.formula = f
					}
					if (!pq.isEmpty(cell)) {
						cell.dataIndx = di;
						cells.length !== j && (cell.indx = j);
						cells.push(cell)
					}
				}
				row = {};
				cells.length && (row.cells = cells);
				rowData.pq_hidden && (row.hidden = true);
				rowData.pq_htfix && (row.htFix = rowData.pq_ht);
				self.copyStyle(row, rowData.pq_rowstyle, rowprop);
				if (rowInit) {
					tmp = (rowInit.call(that, objR) || {}).style;
					if (tmp) {
						self.copyStyle(row, tmp)
					}
				}
				if (!pq.isEmpty(row)) {
					rows.length !== i && (row.indx = i);
					rows.push(row)
				}
			}
			return rows
		},
		getWorkbook: function(CM, CMLen, hc, hcLen, data, dataLen, remotePage, offset, iMerge, render, iGV, header, sheetName) {
			var self = this,
				cols = self.getXlsCols(CM, CMLen),
				mc = [],
				tmp, that = self.that,
				o = that.options,
				fc = o.freezeCols,
				shiftR = header ? hcLen : 0,
				fr = shiftR + (o.freezeRows || 0),
				_header = header ? self.getXlsHeader(hc, hcLen, mc) : [],
				mergeCells = self.getXlsMergeCells(mc, header ? hcLen : 0, iMerge, dataLen),
				body = self.getXlsBody(CM, CMLen, data, dataLen, remotePage, offset, iMerge, render, iGV, shiftR, o.rowInit),
				sheet = {
					columns: cols,
					rows: _header.concat(body)
				};
			if (o.rtl) sheet.rtl = true;
			mergeCells.length && (sheet.mergeCells = mergeCells);
			(tmp = _header.length) && (sheet.headerRows = tmp);
			fr && (sheet.frozenRows = fr);
			fc && (sheet.frozenCols = fc);
			(sheetName || (sheetName = o.title)) && (sheet.name = sheetName);
			sheet.pics = that.iPic.pics;
			return {
				sheets: [sheet]
			}
		},
		postRequest: function(obj) {
			var format = obj.format,
				data, decodeBase, url = obj.url,
				filename = obj.filename || "pqGrid";
			if (obj.zip && format != "xlsx") {
				var zip = new JSZip;
				zip.file(filename + "." + obj.format, obj.data);
				data = zip.generate({
					type: "base64",
					compression: "DEFLATE"
				});
				decodeBase = true;
				format = "zip"
			} else {
				decodeBase = obj.decodeBase ? true : false;
				data = obj.data
			}
			if (url) {
				$.ajax({
					url: url,
					type: "POST",
					cache: false,
					data: {
						pq_ext: format,
						pq_data: data,
						pq_decode: decodeBase,
						pq_filename: filename
					},
					success: function(filename) {
						url = url + ((url.indexOf("?") > 0 ? "&" : "?") + "pq_filename=" + filename);
						$(document.body).append("<iframe height='0' width='0' frameborder='0' src=\"" + url + '"></iframe>')
					}
				})
			}
			return data
		}
	}, pq.mixin.render)
})(jQuery);
(function($) {
	var pqEx = pq.excel = {
		_tmpl: {
			rels: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
		},
		eachRow: function(sheetData, fn) {
			var rows = sheetData.rows,
				i = 0,
				len = rows.length;
			for (; i < len; i++) {
				fn(rows[i], i)
			}
		},
		exportWb: function(obj) {
			var workbook = obj.workbook,
				replace = obj.replace,
				self = this,
				templates = self._tmpl,
				sheets = workbook.sheets,
				no = sheets.length,
				commentArr = [],
				picArr = [],
				zip = new JSZip,
				mediaType = {},
				xl = zip.folder("xl");
			zip.file("_rels/.rels", templates.rels);
			zip.file("xl/_rels/workbook.xml.rels", self.getWBookRels(no));
			sheets.forEach(function(sheet, i) {
				var $cols = self.getCols(sheet.columns),
					comments, pics = sheet.pics || [],
					hasComments, hasImage = pics.length,
					ii = i + 1,
					$frozen = self.getFrozen(sheet.frozenRows, sheet.frozenCols, sheet.rtl),
					$body = self.getBody(sheet.rows || [], sheet.columns || []),
					$merge = self.getMergeCells(sheet.mergeCells);
				if (replace) $body = $body.replace.apply($body, replace);
				comments = self.comments;
				hasComments = !pq.isEmpty(comments);
				xl.file("worksheets/sheet" + ii + ".xml", self.getSheet($frozen, $cols, $body, $merge, hasComments, hasImage, ii));
				if (hasComments) {
					commentArr.push(ii);
					xl.file("comments" + ii + ".xml", self.getComment());
					xl.file("drawings/vmlDrawing" + ii + ".vml", self.getVml())
				}
				if (hasImage) {
					self.addPics(xl, pics, ii);
					pics.forEach(function(pic) {
						mediaType[pic.name.split(["."])[1]] = 1
					});
					picArr.push(ii)
				}
				if (hasComments || hasImage) {
					xl.file("worksheets/_rels/sheet" + ii + ".xml.rels", self.getSheetRel(ii, hasComments, hasImage))
				}
			});
			zip.file("[Content_Types].xml", self.getContentTypes(no, commentArr, picArr, mediaType));
			xl.file("workbook.xml", self.getWBook(sheets, workbook.activeId));
			xl.file("styles.xml", self.getStyle());
			if (obj.url) {
				obj.data = zip.generate({
					type: "base64",
					compression: "DEFLATE"
				});
				obj.decodeBase = true;
				return pq.postRequest(obj)
			} else {
				return zip.generate({
					type: obj.type || "blob",
					compression: "DEFLATE"
				})
			}
		},
		addPics: function(xl, pics, ii) {
			if (pics.length) {
				var draw = ['<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" xmlns:x3Unk="http://schemas.microsoft.com/office/drawing/2010/slicer" xmlns:sle15="http://schemas.microsoft.com/office/drawing/2012/slicer">'],
					drel = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'],
					id = 1,
					p = parseInt,
					factor = 9500,
					str = function(arr) {
						return ["<xdr:col>", arr[0], "</xdr:col><xdr:colOff>", p(arr[1] * factor), "</xdr:colOff><xdr:row>", arr[2], "</xdr:row><xdr:rowOff>", p(arr[3] * factor), "</xdr:rowOff>"].join("")
					};
				pics.forEach(function(pic, i) {
					var from = pic.from,
						oname = pic.name,
						rId = "rId" + id++,
						to = pic.to,
						two = to && !!to.length,
						anchor = two ? "two" : "one",
						cx = p(pic.cx * factor),
						cy = p(pic.cy * factor);
					draw.push("<xdr:", anchor, "CellAnchor>", "<xdr:from>", str(from), "</xdr:from>", two ? "<xdr:to>" + str(to) + "</xdr:to>" : '<xdr:ext cx="' + cx + '" cy="' + cy + '"/>', '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="', pic.id, '" name="Picture ', i + 1, '" descr="', oname, '"/>', '<xdr:cNvPicPr preferRelativeResize="0"/></xdr:nvPicPr>', '<xdr:blipFill><a:blip cstate="print" r:embed="', rId, '"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>', '<xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></xdr:spPr>', '</xdr:pic><xdr:clientData fLocksWithSheet="0"/></xdr:', anchor, "CellAnchor>");
					drel.push('<Relationship Id="', rId, '" Target="../media/', oname, '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" />');
					xl.file("media/" + oname, pic.src.split(",")[1], {
						base64: true
					})
				});
				draw.push("</xdr:wsDr>");
				drel.push("</Relationships>");
				xl.file("drawings/drawing" + ii + ".xml", draw.join(""));
				xl.file("drawings/_rels/drawing" + ii + ".xml.rels", drel.join(""))
			}
		},
		eachCell: function(coll, fn, _i) {
			coll.forEach(function(item, i) {
				var items, cell;
				if (items = item.cells) {
					i = item.indx || i;
					for (var j = 0, len = items.length; j < len; j++) {
						cell = items[j];
						fn(cell, cell.indx || j, i, _i)
					}
				} else if (items = item.rows) {
					this.eachCell(items, fn, i)
				}
			}, this)
		},
		findIndex: function(items, fn) {
			var indx = items.findIndex(fn),
				item = items[indx];
			return item.indx || indx
		},
		getArray: function(sheetData) {
			var str = [],
				self = this;
			this.eachRow(sheetData, function(row) {
				var rowstr = [];
				row.cells.forEach(function(cell) {
					rowstr.push(self.getCell(cell))
				});
				str.push(rowstr)
			});
			return str
		},
		getBody: function(rows, columns) {
			var self = this,
				colObj = {},
				formulas = pq.formulas,
				body = [],
				noTextFormat, comments = self.comments = {},
				comment, i, j, ri, ci, r, t, s, v, f, cell, cells, value, row, rowsLen = rows.length,
				cellsLen, hidden, customHt, column, style, format;
			(columns || []).forEach(function(col, i) {
				colObj[col.indx || i] = col
			});
			for (i = 0; i < rowsLen; i++) {
				row = rows[i];
				cells = row.cells || [];
				cellsLen = cells.length;
				hidden = row.hidden ? 'hidden="1" ' : "";
				customHt = row.htFix ? 'customHeight="1" ht="' + row.htFix / 1.5 + '" ' : "";
				ri = (row.indx || i) + 1;
				r = 'r="' + ri + '"';
				s = self.getStyleIndx(row);
				s = s ? ' s="' + s + '" customFormat="1"' : "";
				body.push("<row " + hidden + customHt + r + s + ">");
				for (j = 0; j < cellsLen; j++) {
					cell = cells[j];
					value = cell.value;
					ci = cell.indx || j;
					t = "";
					s = "";
					column = colObj[ci] || {};
					r = ci === j ? "" : 'r="' + pq.toLetter(ci) + ri + '"';
					style = $.extend({}, column, row, cell);
					format = cell.format;
					noTextFormat = format != "@";
					f = cell.formula;
					f = f ? "<f>" + pq.escapeXml(f) + "</f>" : "";
					if (value == null) {
						v = "<v></v>"
					} else if (noTextFormat && typeof value == "boolean") {
						v = "<v>" + (value ? "1" : "0") + "</v>";
						t = 't="b"'
					} else if (noTextFormat && value == value * 1 && (value + "")[0] != "0") {
						v = "<v>" + value + "</v>"
					} else if (noTextFormat && format && formulas.isDate(value)) {
						v = "<v>" + formulas.VALUE(value) + "</v>"
					} else {
						t = 't="inlineStr"';
						v = "<is><t><![CDATA[" + value + "]]></t></is>"
					}
					s = self.getStyleIndx(style);
					s = s ? 's="' + s + '"' : "";
					if (comment = cell.comment) comments[pq.toLetter(ci) + ri] = comment;
					body.push("<c " + t + " " + r + " " + s + ">" + f + v + "</c>")
				}
				body.push("</row>")
			}
			return body.join("")
		},
		getCell: function(cell) {
			var f = cell.format,
				v = cell.value;
			return f ? pq.formulas.TEXT(v, f) : v
		},
		getCSV: function(sheetData) {
			var str = [],
				self = this;
			this.eachRow(sheetData, function(row) {
				var rowstr = [];
				row.cells.forEach(function(cell) {
					rowstr.push(self.getCell(cell))
				});
				str.push(rowstr.join(","))
			});
			return str.join("\r\n")
		},
		getColor: function() {
			var colors = {},
				padd = function(val) {
					return val.length === 1 ? "0" + val : val
				};
			return function(color) {
				var m, a, c = colors[color];
				if (!c) {
					if (/^#[0-9,a,b,c,d,e,f]{6}$/i.test(color)) {
						a = color.replace("#", "")
					} else if (m = color.match(/^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/i)) {
						a = padd((m[1] * 1).toString(16)) + padd((m[2] * 1).toString(16)) + padd((m[3] * 1).toString(16))
					}
					if (a && a.length === 6) {
						c = colors[color] = "ff" + a
					}
				}
				if (c) return c;
				else throw "invalid color: " + color
			}
		}(),
		_getCol: function(cols, min, max, hidden, width, style) {
			style = style ? ' style="' + style + '"' : "";
			if (!hidden || width) {
				width = width || this.colWidth;
				width = (width / this.colRatio).toFixed(2) * 1;
				width = ' customWidth="1" width="' + width + '"'
			}
			cols.push('<col min="', min, '" max="', max, '" hidden="', hidden, '"', width, style, "/>")
		},
		getCols: function(CM) {
			if (!CM || !CM.length) {
				return ""
			}
			var cols = [],
				min, max, oldWidth, oldHidden, oldStyle, col = 0,
				oldCol = 0,
				non_first, i = 0,
				len = CM.length;
			cols.push("<cols>");
			for (; i < len; i++) {
				var c = CM[i],
					hidden = c.hidden ? 1 : 0,
					width = c.width,
					style = this.getStyleIndx(c),
					indx = c.indx;
				col = (indx || col) + 1;
				if (oldWidth === width && oldHidden === hidden && style == oldStyle && col == oldCol + 1) {
					max = col
				} else {
					if (non_first) {
						this._getCol(cols, min, max, oldHidden, oldWidth, oldStyle);
						min = null
					}
					max = col;
					min == null && (min = col)
				}
				oldWidth = width;
				oldHidden = hidden;
				oldStyle = style;
				oldCol = col;
				non_first = true
			}
			this._getCol(cols, min, max, oldHidden, oldWidth, oldStyle);
			cols.push("</cols>");
			return cols.join("")
		},
		getComment: function() {
			var comment = [],
				c = this.comments,
				key;
			for (key in c) {
				comment.push('<comment authorId="0" ref="', key, '"><text><t xml:space="preserve">', c[key].replace(/</g, "&lt;").replace(/>/g, "&gt;"), "</t></text></comment>")
			}
			return ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', '<comments xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">', "<authors><author></author></authors>", "<commentList>", comment.join(""), "</commentList></comments>"].join("")
		},
		getContentTypes: function(no, commentArr, picArr, mediaType) {
			var sheets = [],
				i = 1,
				comment = [],
				key, drw = [];
			for (; i <= no; i++) {
				sheets.push('<Override PartName="/xl/worksheets/sheet' + i + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
			}
			commentArr.forEach(function(i) {
				comment.push('<Override PartName="/xl/comments', i, '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml" />')
			});
			for (key in mediaType) {
				drw.push('<Default Extension="' + key + '" ContentType="image/' + key + '" />')
			}
			picArr.forEach(function(i) {
				drw.push('<Override PartName="/xl/drawings/drawing', i, '.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>')
			});
			return ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">', '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>', '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>', '<Default Extension="xml" ContentType="application/xml" />', '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>', sheets.join(""), '<Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing" />', comment.join(""), drw.join(""), "</Types>"].join("")
		},
		getFillIndx: function(bgColor) {
			var self = this,
				fs = self.fills = self.fills || {
					length: 2
				};
			return self.getIndx(fs, bgColor)
		},
		getBorderIndx: function(border) {
			var self = this,
				fs = self.borders = self.borders || {
					length: 1
				};
			return self.getIndx(fs, JSON.stringify(border))
		},
		getFontIndx: function(color, font, fontSize, bold, italic, uline) {
			var self = this,
				fs = self.fonts = self.fonts || {
					length: 1
				};
			return self.getIndx(fs, (color || "") + "_" + (font || "") + "_" + (fontSize || "") + "_" + (bold || "") + "_" + (italic || "") + "_" + (uline || ""))
		},
		getFormatIndx: function(format) {
			var self = this,
				fs = self.formats = self.formats || {
					length: 164
				};
			return self.numFmtIds[format] || self.getIndx(fs, format)
		},
		getFrozen: function(r, c, rtl) {
			r = r || 0;
			c = c || 0;
			var topLeftCell = pq.toLetter(c) + (r + 1);
			return ["<sheetViews><sheetView ", rtl ? 'rightToLeft="1"' : "", ' workbookViewId="0">', '<pane xSplit="', c, '" ySplit="', r, '" topLeftCell="', topLeftCell, '" activePane="bottomLeft" state="frozen"/>', "</sheetView></sheetViews>"].join("")
		},
		getIndx: function(fs, val) {
			var indx = fs[val];
			if (indx == null) {
				indx = fs[val] = fs.length;
				fs.length++
			}
			return indx
		},
		getItem: function(items, indx) {
			var item = items[indx],
				i1 = 0,
				i2, i, iter = 0,
				iindx = item ? item.indx : -1;
			if (iindx == null || indx == iindx) {
				return item
			}
			i2 = iindx == -1 ? items.length - 1 : indx;
			if (i2 >= 0) {
				while (true) {
					iter++;
					if (iter > 20) {
						throw "not found"
					}
					i = Math.floor((i2 + i1) / 2);
					item = items[i];
					iindx = item.indx;
					if (iindx == indx) {
						return item
					} else if (iindx > indx) {
						i2 = i
					} else {
						i1 = i == i1 ? i + 1 : i
					}
					if (i1 == i2 && i == i1) {
						break
					}
				}
			}
		},
		getMergeCells: function(mc) {
			mc = mc || [];
			var mcs = [],
				i = 0,
				mcLen = mc.length;
			mcs.push('<mergeCells count="' + mcLen + '">');
			for (; i < mcLen; i++) {
				mcs.push('<mergeCell ref="', mc[i], '"/>')
			}
			mcs.push("</mergeCells>");
			return mcLen ? mcs.join("") : ""
		},
		getSheetRel: function(i, comment, pic) {
			var arr = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'];
			if (comment) {
				arr.push('<Relationship Id="com' + i + '" Target="../comments' + i + '.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" />', '<Relationship Id="vml' + i + '" Target="../drawings/vmlDrawing' + i + '.vml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing" />')
			}
			if (pic) {
				arr.push('<Relationship Id="rId' + i + '" Target="../drawings/drawing' + i + '.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing"/>')
			}
			arr.push("</Relationships>");
			return arr.join("")
		},
		getSheet: function($frozen, $cols, $body, $merge, hasComments, hasImage, indx) {
			return ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">', $frozen, $cols, "<sheetData>", $body, "</sheetData>", $merge, hasImage ? '<drawing r:id="rId' + indx + '" />' : "", hasComments ? '<legacyDrawing r:id="vml' + indx + '" />' : "", "</worksheet>"].join("")
		},
		getStyleIndx: function(c) {
			var format = c.format,
				bgColor = c.bgColor,
				color = c.color,
				font = c.font,
				fontSize = c.fontSize,
				align = c.align,
				valign = c.valign,
				wrap = c.wrap,
				bold = c.bold,
				italic = c.italic,
				uline = c.underline,
				border = c.border;
			if (format || bgColor || color || font || fontSize || align || valign || wrap || bold || italic || uline || border) {
				var self = this,
					formatIndx = format ? self.getFormatIndx(format) : "",
					fillIndx = bgColor ? self.getFillIndx(bgColor) : "",
					borderIndx = border ? self.getBorderIndx(border) : "",
					fontIndx = color || font || fontSize || bold || italic || uline ? self.getFontIndx(color, font, fontSize, bold, italic, uline) : "",
					val = formatIndx + "_" + fillIndx + "_" + fontIndx + "_" + (align || "") + "_" + (valign || "") + "_" + (wrap || "") + "_" + borderIndx,
					fs = self.styles = self.styles || {
						length: 1
					};
				return self.getIndx(fs, val)
			}
		},
		getStyle: function() {
			var self = this,
				formats = self.formats,
				color, fontSize, _font, fills = self.fills,
				fonts = self.fonts,
				borders = self.borders,
				borderArr = ["left", "right", "top", "bottom"],
				bold, italic, uline, arr, formatIndx, fillIndx, fontIndx, align, valign, wrap, borderIndx, styles = self.styles,
				applyFill, applyFormat, applyFont, applyAlign, applyBorder, f1 = [],
				fill = [],
				font = [],
				border = [],
				xf = ['<xf numFmtId="0" applyNumberFormat="1"/>'],
				f;
			if (formats) {
				delete formats.length;
				for (f in formats) {
					f1.push('<numFmt numFmtId="' + formats[f] + '" formatCode="' + f + '"/>')
				}
				delete self.formats
			}
			if (fills) {
				delete fills.length;
				for (f in fills) {
					fill.push('<fill><patternFill patternType="solid"><fgColor rgb="' + this.getColor(f) + '"/></patternFill></fill>')
				}
				delete self.fills
			}
			if (fonts) {
				delete fonts.length;
				for (f in fonts) {
					arr = f.split("_");
					color = "<color " + (arr[0] ? 'rgb="' + this.getColor(arr[0]) + '"' : 'theme="1"') + " />";
					_font = '<name val="' + (arr[1] || "Calibri") + '"/>';
					fontSize = '<sz val="' + (arr[2] || 11) + '"/>';
					bold = arr[3] ? "<b/>" : "";
					italic = arr[4] ? "<i/>" : "";
					uline = arr[5] ? "<u/>" : "";
					font.push("<font>", bold, italic, uline, fontSize, color, _font, '<family val="2"/></font>')
				}
				delete self.fonts
			}
			if (borders) {
				delete borders.length;
				for (f in borders) {
					var obj = JSON.parse(f);
					border.push("<border>");
					borderArr.forEach(function(l) {
						if (obj[l]) {
							arr = obj[l].split(" ");
							border.push("<" + l + ' style="' + (arr[0] == "1px" ? "thin" : "double") + '"><color rgb="' + self.getColor(arr[2]) + '"/></' + l + ">")
						}
					});
					border.push("</border>")
				}
				delete self.borders
			}
			if (styles) {
				delete styles.length;
				for (f in styles) {
					arr = f.split("_");
					formatIndx = arr[0];
					fillIndx = arr[1];
					fontIndx = arr[2];
					align = arr[3];
					valign = arr[4];
					wrap = arr[5];
					borderIndx = arr[6];
					applyFill = fillIndx ? ' applyFill="1" fillId="' + fillIndx + '" ' : "";
					applyFont = fontIndx ? ' applyFont="1" fontId="' + fontIndx + '" ' : "";
					applyFormat = formatIndx ? ' applyNumberFormat="1" numFmtId="' + formatIndx + '"' : "";
					applyBorder = borderIndx ? ' applyBorder="1" borderId="' + borderIndx + '"' : "";
					align = align ? ' horizontal="' + align + '" ' : "";
					valign = valign ? ' vertical="' + valign + '" ' : "";
					wrap = wrap ? ' wrapText="1" ' : "";
					applyAlign = align || valign || wrap ? ' applyAlignment="1"><alignment ' + align + valign + wrap + "/></xf>" : "/>";
					xf.push("<xf " + applyFormat + applyFill + applyFont + applyBorder + applyAlign)
				}
				delete this.styles
			}
			f1 = f1.join("\n");
			xf = xf.join("\n");
			fill = fill.join("\n");
			font = font.join("");
			border = border.join("\n");
			return ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">', "<numFmts>", f1, "</numFmts>", "<fonts>", '<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>', font, "</fonts>", '<fills><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>', fill, "</fills>", "<borders><border><left/><right/><top/><bottom/><diagonal/></border>", border, "</borders>", '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>', "</cellStyleXfs>", "<cellXfs>", xf, "</cellXfs>", '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>', '<dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleLight16"/>', "</styleSheet>"].join("")
		},
		getVml: function() {
			var shapes = [],
				c = this.comments,
				key;
			for (key in c) {
				var arr = key.match(/([A-Z]+)(\d+)/),
					ci = pq.toNumber(arr[1]),
					ri = arr[2] - 1;
				shapes.push('<v:shape id="1" type="#0" style="position:absolute;margin-left:259.25pt;margin-top:1.5pt;width:108pt;height:59.25pt;z-index:1;visibility:hidden" fillcolor="#ffffe1" o:insetmode="auto"><v:fill color2="#ffffe1"/><v:shadow on="t" color="black" obscured="t"/><v:path o:connecttype="none"/><v:textbox style="mso-direction-alt:auto"><div style="text-align:right"></div></v:textbox><x:ClientData ObjectType="Note"><x:MoveWithCells/><x:SizeWithCells/><x:Anchor>1, 15, 0, 2, 3, 31, 4, 1</x:Anchor><x:AutoFill>False</x:AutoFill>', "<x:Row>", ri, "</x:Row>", "<x:Column>", ci, "</x:Column></x:ClientData></v:shape>")
			}
			return ['<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout>', '<v:shapetype id="0" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe"><v:stroke joinstyle="miter"/><v:path gradientshapeok="t" o:connecttype="rect"/></v:shapetype>', shapes.join(""), "</xml>"].join("")
		},
		getWBook: function(sheets, activeId) {
			var activeTab = activeId >= 0 ? "activeTab='" + activeId + "'" : "";
			return ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">', "<bookViews><workbookView " + activeTab + " /></bookViews><sheets>", sheets.map(function(sheet, id) {
				id++;
				var name = sheet.name,
					state = sheet.hidden ? 'state="hidden"' : "";
				return ["<sheet ", state, ' name="', name ? pq.escapeXml(name) : "sheet" + id, '" sheetId="', id, '" r:id="rId', id, '"/>'].join("")
			}).join(""), "</sheets></workbook>"].join("")
		},
		getWBookRels: function(no) {
			var arr = [],
				i = 1;
			for (; i <= no; i++) {
				arr.push('<Relationship Id="rId' + i + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + i + '.xml"/>')
			}
			return ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">', arr.join(""), '<Relationship Id="rId', i, '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>', "</Relationships>"].join("")
		},
		importXl: function() {
			var o = pq.excelImport;
			return o.Import.apply(o, arguments)
		},
		SpreadSheet: function(s) {
			var ss = pqEx.SpreadSheet,
				key;
			if (this instanceof ss == false) {
				return new ss(s)
			}
			for (key in s) {
				this[key] = s[key]
			}
		}
	};
	pqEx.colRatio = 8;
	pqEx.colWidth = pqEx.colRatio * 8.43;
	pqEx.numFmtIds = function() {
		var fmt = pq.excelImport.preDefFormats,
			obj = {};
		for (var key in fmt) {
			obj[fmt[key]] = key
		}
		return obj
	}();
	pq.postRequest = function(obj) {
		var format = obj.format,
			data, decodeBase, url = obj.url,
			filename = obj.filename || "pqGrid";
		if (obj.zip && format != "xlsx") {
			var zip = new JSZip;
			zip.file(filename + "." + obj.format, obj.data);
			data = zip.generate({
				type: "base64",
				compression: "DEFLATE"
			});
			decodeBase = true;
			format = "zip"
		} else {
			decodeBase = obj.decodeBase ? true : false;
			data = obj.data
		}
		if (url) {
			$.ajax({
				url: url,
				type: "POST",
				cache: false,
				data: {
					pq_ext: format,
					pq_data: data,
					pq_decode: decodeBase,
					pq_filename: filename
				},
				success: function(filename) {
					url = url + ((url.indexOf("?") > 0 ? "&" : "?") + "pq_filename=" + filename);
					$(document.body).append("<iframe height='0' width='0' frameborder='0' src=\"" + url + '"></iframe>')
				}
			})
		}
		return data
	};
	pqEx.SpreadSheet.prototype = {
		getCell: function(ri, ci) {
			var rows = this.rows || [],
				row = pqEx.getItem(rows, ri) || {
					cells: []
				},
				cell = pqEx.getItem(row.cells, ci);
			return cell
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.pqGrid.defaults.formulasModel = {
		on: true
	};
	_pq.pqGrid.prototype.getFormula = function(rd, di) {
		var fnW = this.iFormulas.getFnW(rd, di);
		return fnW ? fnW.fn : undefined
	};
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance,
			f, FM = grid.options.formulasModel;
		if (FM.on) {
			f = grid.iFormulas = new cF(grid)
		}
		grid.Formulas = function() {
			return f
		}
	});
	var cF = _pq.cFormulas = function(that) {
		var self = this;
		self.that = that;
		self.fn = {};
		self.tabNames = {};
		that.on("dataReadyDone", self.onDataReadyDone.bind(self)).on("colMove colAdd colRemove", self.onColumnOrder.bind(self)).on("beforeValidateDone", self.onBeforeValidateDone.bind(self)).on("autofillSeries", self.onAutofill.bind(self)).on("editorBegin", self.onEditorBegin.bind(self)).on("editorEnd", self.onEditorEnd.bind(self)).on("editorKeyUp editorClick", self.onEditorKeyUp.bind(self)).on(true, "change", self.onChange.bind(self)).on("tabChange", self.onTabChange.bind(self)).on("tabRename", self.onTabRename.bind(self))
	};
	$.extend(cF, {
		deString: function(fn, cb, exec) {
			var arr = [];
			fn = fn.replace(/(?:^|[^"]+)"(([^"]|"{2})+)"(?=([^"]+|$))/g, function(a, b) {
				var indx = a.indexOf('"' + b + '"');
				arr.push(b);
				return a.slice(0, indx) + "#" + (arr.length - 1) + "#"
			});
			fn = cb(fn);
			arr.forEach(function(_str, i) {
				exec && (_str = _str.replace(/""/g, '\\"'));
				fn = fn.replace("#" + i + "#", '"' + _str + '"')
			});
			return fn
		},
		reSheet: "(?:[^\\*\\?:\\[\\](\\)\\+\\-]+!)?",
		selectExp: function(val, pos) {
			var valPos = val.slice(0, pos).replace(/"[^"]*"/g, ""),
				m1, m2, remain, exp;
			if (!/"[^"]+$/.test(valPos)) {
				remain = val.slice(pos);
				if ((m1 = valPos.match(/.*?([a-z0-9:$]+)$/i)) && (remain === "" && (m2 = []) || (m2 = remain.match(/^([a-z0-9:$]+)?.*/i)))) {
					exp = (m1[1] + (m2[1] == null ? "" : m2[1])).replace(/\$/g, "").toUpperCase();
					return exp
				}
			}
		},
		shiftRC: function(that) {
			var self = cF,
				maxRI = that ? that.get_p_data().length - 1 : 0,
				maxCI = that ? that.colModel.length - 1 : 0;
			return function(fn, diffX, diffY) {
				diffX && (fn = self.shiftC(fn, diffX, maxCI));
				diffY && (fn = self.shiftR(fn, diffY, maxRI));
				return fn
			}
		},
		getTab: function(sheet) {
			var tabName = sheet.slice(0, sheet.length - 1).replace(/''/g, "'");
			if (tabName[0] == "'") {
				tabName = tabName.slice(1, tabName.length - 1)
			}
			return tabName
		},
		shiftR: function(fn, diff, maxRI, tabs) {
			var reSheet = cF.reSheetC,
				re1 = new RegExp(reSheet + "(\\$?)([A-Z]+)(\\$?)([\\d]+(?!!))", "g"),
				re2 = new RegExp(reSheet + "(\\$?)([0-9]+):(\\$?)([0-9]+)", "g"),
				getMaxRI = function(sheet) {
					return tabs[cF.getTab(sheet)].pdata.length - 1
				};
			return cF.deString(fn, function(_fn) {
				return _fn.replace(re1, function(full, sheet, dollar1, letter, dollar2, i) {
					if (dollar2) {
						return full
					} else {
						var ri = i * 1 + diff - 1;
						maxRI = sheet ? getMaxRI(sheet) : maxRI;
						ri = ri < 0 ? 0 : maxRI && ri > maxRI ? maxRI : ri;
						return (sheet || "") + dollar1 + letter + (ri + 1)
					}
				}).replace(re2, function(full, sheet, dollar1, ri1, dollar2, ri2) {
					var ri;
					maxRI = sheet ? getMaxRI(sheet) : maxRI;
					if (!dollar1) {
						ri = ri1 * 1 + diff - 1;
						ri = ri < 0 ? 0 : maxRI && ri > maxRI ? maxRI : ri;
						ri1 = ri + 1
					}
					if (!dollar2) {
						ri = ri2 * 1 + diff - 1;
						ri = ri < 0 ? 0 : maxRI && ri > maxRI ? maxRI : ri;
						ri2 = ri + 1
					}
					return (sheet || "") + dollar1 + ri1 + ":" + dollar2 + ri2
				})
			})
		},
		shiftC: function(fn, diff, maxCI, tabs) {
			var reSheet = cF.reSheetC,
				re1 = new RegExp(reSheet + "(\\$?)([A-Z]+)(\\$?)([\\d]+)", "g"),
				re2 = new RegExp(reSheet + "(\\$?)([A-Z]+):(\\$?)([A-Z]+)", "g"),
				getMaxCI = function(sheet) {
					return tabs[cF.getTab(sheet)].colModel.length - 1
				};
			return cF.deString(fn, function(_fn) {
				_fn = _fn.replace(re1, function(full, sheet, dollar1, letter, dollar2, i) {
					if (dollar1) {
						return full
					} else {
						var ci = pq.toNumber(letter) + diff;
						maxCI = sheet ? getMaxCI(sheet) : maxCI;
						ci = ci < 0 ? 0 : maxCI && ci > maxCI ? maxCI : ci;
						return (sheet || "") + pq.toLetter(ci) + dollar2 + i
					}
				});
				return _fn.replace(re2, function(full, sheet, dollar1, letter1, dollar2, letter2) {
					var c;
					maxCI = sheet ? getMaxCI(sheet) : maxCI;
					if (!dollar1) {
						c = pq.toNumber(letter1) + diff;
						c = c < 0 ? 0 : maxCI && c > maxCI ? maxCI : c;
						letter1 = pq.toLetter(c)
					}
					if (!dollar2) {
						c = pq.toNumber(letter2) + diff;
						c = c < 0 ? 0 : maxCI && c > maxCI ? maxCI : c;
						letter2 = pq.toLetter(c)
					}
					return (sheet || "") + dollar1 + letter1 + ":" + dollar2 + letter2
				})
			})
		}
	});
	cF.reSheetC = cF.reSheet.replace("?:", "");
	cF.prototype = {
		addRowIndx: function(addList) {
			addList.forEach(function(rObj) {
				var rd = rObj.newRow,
					pq_fn = rd.pq_fn,
					fn, key;
				if (pq_fn) {
					for (key in pq_fn) {
						fn = pq_fn[key];
						fn.ri = fn.riO = rd.pq_ri
					}
				}
			})
		},
		cell: function(exp) {
			var cell = this.toCell(exp),
				r = cell.r,
				c = cell.c;
			return this.valueArr(r, c)[0]
		},
		check: function(fn) {
			return cF.deString(fn, function(fn) {
				fn = fn.replace(/[^']+(\s+)(?![^']+')/g, function(a) {
					return a.replace(/\s/g, "")
				});
				return fn.toUpperCase().replace(/([A-Z]+)([0-9]+)\:([A-Z]+)([0-9]+)/g, function(full, c1, r1, c2, r2) {
					c1 = pq.toNumber(c1);
					c2 = pq.toNumber(c2);
					if (c1 > c2) {
						c1 = [c2, c2 = c1][0]
					}
					if (r1 * 1 > r2 * 1) {
						r1 = [r2, r2 = r1][0]
					}
					return pq.toLetter(c1) + r1 + ":" + pq.toLetter(c2) + r2
				})
			})
		},
		computeAll: function() {
			var self = this,
				that = self.that,
				present;
			self.initObj();
			self.eachFormula(function(fnW) {
				fnW.clean = 0;
				present = true
			});
			if (present) {
				self.eachFormula(function(fnW, rd, di, ri, isMain) {
					rd[di] = self.execIfDirty(fnW);
					isMain && that.isValid({
						rowIndx: ri,
						rowData: rd,
						dataIndx: di,
						allowInvalid: true
					})
				});
				return true
			}
		},
		eachFormula: function(fn) {
			var self = this,
				isMain = true,
				that = self.that,
				cb = function(rd, ri, pq_fn) {
					var di, fnW;
					for (di in pq_fn) {
						fnW = pq_fn[di];
						if (typeof fnW != "string") {
							fn(fnW, rd, di, ri, isMain)
						}
					}
				},
				cb2 = function(data) {
					data = data || [];
					var i = data.length,
						rd, pq_fn;
					while (i--)(rd = data[i]) && (pq_fn = rd.pq_fn) && cb(rd, i, pq_fn)
				};
			cb2(that.get_p_data());
			isMain = false;
			cb2(that.options.summaryData)
		},
		execIfDirty: function(fnW) {
			if (!fnW.clean) {
				fnW.clean = .5;
				fnW.val = this.exec(fnW.fn, fnW.ri, fnW.ci);
				fnW.clean = 1
			} else if (fnW.clean == .5) {
				return
			}
			return fnW.val
		},
		replace: function(a, b, rangeOrCell) {
			var indx = b.lastIndexOf("!"),
				self = this,
				absame = a === b,
				obj = self.obj,
				first;
			if (indx > 0) {
				var iTab = self.that.iTab,
					tabs = iTab.tabs(),
					id, tab;
				tabName = b.substr(0, indx), ref = b.substr(indx + 1, b.length - 1);
				if (tabName[0] == "'") {
					tabName = tabName.slice(1, tabName.length - 1);
					tabName = tabName.replace(/''/g, "'");
					b = tabName + "!" + ref
				}
				id = tabs.findIndex(function(tab) {
					return tab.name.toUpperCase() == tabName
				});
				if (id >= 0) {
					tab = tabs[id];
					self.tabNames[tabName] = instance = iTab.grid(tab) || iTab.create(id);
					obj[b] = obj[b] || instance.iFormulas[rangeOrCell](ref)
				}
				b = b.replace(/'/g, "\\'")
			} else {
				obj[b] = obj[b] || self[rangeOrCell](b)
			}
			if (rangeOrCell == "range") {
				return "this['" + b + "']"
			} else {
				first = a.charAt(0);
				return (absame ? "" : first == "$" ? "" : first) + ("this['" + b + "']")
			}
		},
		exec: function(_fn, r, c) {
			var self = this,
				obj = self.obj,
				reSheet = cF.reSheet,
				fn = cF.deString(_fn, function(fn) {
					fn = fn.replace(/(?:\(|\,|^|\+)(\$?[A-Z]+\$?[0-9]+([A-Z0-9\+]+)\$?[A-Z]+\$?[0-9]+)(?:\)|\,|$|\+)/g, function(full, a) {
						var arr = a.split("+"),
							ret = "SUM(" + arr.join(",") + ")",
							prefix = full[0],
							suffix = full[full.length - 1];
						prefix = prefix == a[0] ? "" : prefix;
						suffix = suffix == a[a.length - 1] ? "" : suffix;
						return prefix + ret + suffix
					});
					fn = fn.replace(new RegExp("(" + reSheet + "\\$?([A-Z]+)?\\$?([0-9]+)?\\:\\$?([A-Z]+)?\\$?([0-9]+)?)", "g"), function(a, b) {
						return self.replace(a, b, "range")
					});
					fn = fn.replace(new RegExp("(?:[^:A-Z']|^)(" + reSheet + "\\$?[A-Z]+\\$?[0-9]+)(?![:\\d]+)", "g"), function(a, b) {
						return self.replace(a, b, "cell")
					});
					fn = fn.replace(/{/g, "[").replace(/}/g, "]").replace(/(?:[^><])(=+)/g, function(a, b) {
						return a + (b.length === 1 ? "==" : "")
					}).replace(/<>/g, "!==").replace(/&/g, "+");
					return fn
				}, true);
			obj.getRange = function() {
				return {
					r1: r,
					c1: c
				}
			};
			try {
				var v = new Function("with(this){return " + fn + "}").call(obj);
				if (typeof v == "function") {
					v = "#NAME?"
				} else if (typeof v == "string") {
					cF.deString(v, function(fn) {
						if (fn.indexOf("function") >= 0) {
							v = "#NAME?"
						}
					})
				}
				v !== v && (v = null)
			} catch (ex) {
				v = typeof ex == "string" ? ex : ex.message
			}
			return v
		},
		initObj: function() {
			this.obj = $.extend({
				iFormula: this
			}, pq.formulas)
		},
		onAutofill: function(evt, ui) {
			var sel = ui.sel,
				self = this,
				that = self.that,
				r = sel.r,
				c = sel.c,
				xDir = ui.x,
				rd = that.getRowData({
					rowIndx: r
				}),
				CM = that.colModel,
				maxCi = CM.length - 1,
				maxRi = that.get_p_data().length - 1,
				tabs = self.tabNames,
				di = CM[c].dataIndx,
				fnW = self.getFnW(rd, di);
			fnW && (ui.series = function(x) {
				return "=" + (xDir ? cF.shiftC(fnW.fn, x - 1, maxCi, tabs) : cF.shiftR(fnW.fn, x - 1, maxRi, tabs))
			})
		},
		onBeforeValidateDone: function(evt, ui) {
			var self = this,
				colIndxs = this.that.colIndxs,
				fn = function(list) {
					list.forEach(function(rObj) {
						var newRow = rObj.newRow,
							val, di, rd = rObj.rowData,
							fnW;
						for (di in newRow) {
							val = newRow[di];
							if (typeof val == "string" && val[0] === "=") {
								ui.allowInvalid = true;
								var fn = self.check(val),
									fnWOld = rd ? self.getFnW(rd, di) : null;
								if (fnWOld) {
									if (fn !== fnWOld.fn) {
										rObj.oldRow[di] = "=" + fnWOld.fn;
										self.save(rd, di, fn, rObj.rowIndx, colIndxs[di])
									}
								} else {
									self.save(rd || newRow, di, fn, rObj.rowIndx, colIndxs[di])
								}
							} else if (rd) {
								if (fnW = self.remove(rd, di)) {
									rObj.oldRow[di] = "=" + fnW.fn
								}
							}
						}
					})
				};
			fn(ui.addList);
			fn(ui.updateList)
		},
		onTabChange: function(evt, ui) {
			if (this.tabNames[ui.tab.name.toUpperCase()] && !ui.addList.length && !ui.deleteList.length) {
				this.computeAll();
				this.that.refresh()
			}
		},
		onTabRename: function(evt, ui) {
			var tabNames = this.tabNames,
				oldName = ui.oldVal.toUpperCase(),
				val = ui.tab.name.toUpperCase(),
				tabToFn = function(_val) {
					_val = _val.replace(/'/g, "''");
					if (/[\s~!@#'\.,$%^&(\)<>]+/.test(_val)) _val = "'" + _val + "'";
					return _val + "!"
				};
			if (tabNames[oldName]) {
				delete tabNames[oldName];
				tabNames[val] = 1;
				val = tabToFn(val);
				oldName = tabToFn(oldName);
				this.eachFormula(function(fnW) {
					fnW.fn = fnW.fn.split(oldName).join(val)
				})
			}
		},
		onChange: function(evt, ui) {
			this.addRowIndx(ui.addList);
			if (!ui.addList.length && !ui.deleteList.length) {
				if (this.computeAll()) {
					ui.source === "edit" && this.that.refresh({
						header: false
					})
				}
			}
		},
		onColumnOrder: function() {
			var self = this,
				ciNew, diff, that = self.that,
				shift = cF.shiftRC(that),
				colIndxs = that.colIndxs;
			self.eachFormula(function(fnW, rd, di) {
				ciNew = colIndxs[di];
				if (fnW.ci != ciNew) {
					diff = ciNew - fnW.ciO;
					fnW.ci = ciNew;
					fnW.fn = shift(fnW.fnOrig, diff, fnW.ri - fnW.riO)
				}
			});
			ciNew != null && self.computeAll()
		},
		onEditorBegin: function(evt, ui) {
			var fnW = this.getFnW(ui.rowData, ui.dataIndx);
			fnW && ui.$editor.val("=" + fnW.fn)
		},
		onEditorEnd: function() {
			pq.intel.hide()
		},
		onEditorKeyUp: function(evt, ui) {
			var $ed = ui.$editor,
				ed = $ed[0],
				val = ed.value,
				i = pq.intel,
				pos = ed.selectionEnd;
			if (val && val.indexOf("=") === 0) {
				i.popup(val, pos, $ed);
				this.select(val, pos)
			}
		},
		onDataReadyDone: function() {
			var self = this,
				present, that = self.that,
				shift = cF.shiftRC(that),
				colIndxs = that.colIndxs,
				cb = function(rd, riNew, pq_fn) {
					var fnW, di, diff;
					for (di in pq_fn) {
						fnW = pq_fn[di];
						present = true;
						if (typeof fnW == "string") {
							self.save(rd, di, self.check(fnW), riNew, colIndxs[di])
						} else if (fnW.ri != riNew) {
							diff = riNew - fnW.riO;
							fnW.ri = riNew;
							fnW.fn = shift(fnW.fnOrig, fnW.ci - fnW.ciO, diff)
						}
					}
				},
				cb2 = function(data) {
					data = data || [];
					var i = data.length,
						rd, pq_fn;
					while (i--)(rd = data[i]) && (pq_fn = rd.pq_fn) && cb(rd, i, pq_fn)
				};
			cb2(that.get_p_data());
			cb2(that.options.summaryData);
			self.initObj();
			present && self.computeAll()
		},
		getFnW: function(rd, di) {
			var fn;
			if (fn = rd.pq_fn) {
				return fn[di]
			}
		},
		remove: function(rd, di) {
			var pq_fn = rd.pq_fn,
				fnW;
			if (pq_fn && (fnW = pq_fn[di])) {
				delete pq_fn[di];
				if (pq.isEmpty(pq_fn)) {
					delete rd.pq_fn
				}
				return fnW
			}
		},
		range: function(exp) {
			var arr = exp.split(":"),
				that = this.that,
				cell1 = this.toCell(arr[0]),
				r1 = cell1.r,
				c1 = cell1.c,
				cell2 = this.toCell(arr[1]),
				r2 = cell2.r,
				c2 = cell2.c;
			return this.valueArr(r1 == null ? 0 : r1, c1 == null ? 0 : c1, r2 == null ? that.get_p_data().length - 1 : r2, c2 == null ? that.colModel.length - 1 : c2)
		},
		save: function(rd, di, fn, ri, ci) {
			var fns, fn_checked = fn.replace(/^=/, ""),
				fnW = {
					clean: 0,
					fn: fn_checked,
					fnOrig: fn_checked,
					riO: ri,
					ciO: ci,
					ri: ri,
					ci: ci
				};
			fns = rd.pq_fn = rd.pq_fn || {};
			fns[di] = fnW;
			return fnW
		},
		selectRange: function(val, pos) {
			var exp = cF.selectExp(val, pos),
				arr, m1, m2, range;
			if (exp) {
				if (/^([a-z0-9]+):([a-z0-9]+)$/i.test(exp)) {
					arr = exp.split(":");
					m1 = this.toCell(arr[0]);
					m2 = this.toCell(arr[1]);
					range = {
						r1: m1.r,
						c1: m1.c,
						r2: m2.r,
						c2: m2.c
					}
				} else if (/^[a-z]+[0-9]+$/i.test(exp)) {
					m1 = this.toCell(exp);
					range = {
						r1: m1.r,
						c1: m1.c
					}
				}
				return range
			}
		},
		select: function(val, pos) {
			var range = this.selectRange(val, pos),
				that = this.that;
			range ? that.Range(range).select() : that.Selection().removeAll();
		},
		toCell: function(address) {
			var m = address.match(/\$?([A-Z]+)?\$?(\d+)?/);
			return {
				c: m[1] ? pq.toNumber(m[1]) : null,
				r: m[2] ? m[2] - 1 : null
			}
		},
		valueArr: function(r1, c1, r2, c2) {
			var that = this.that,
				CM = that.colModel,
				clen = CM.length,
				ri, ci, rd, di, fnW, val, nval, arr = [],
				arr2 = [],
				_arr2 = [],
				data = that.get_p_data(),
				dlen = data.length;
			r2 = r2 == null ? r1 : r2;
			c2 = c2 == null ? c1 : c2;
			r1 = r1 < 0 ? 0 : r1;
			c1 = c1 < 0 ? 0 : c1;
			r2 = r2 >= dlen ? dlen - 1 : r2;
			c2 = c2 >= clen ? clen - 1 : c2;
			for (ri = r1; ri <= r2; ri++) {
				rd = data[ri];
				for (ci = c1; ci <= c2; ci++) {
					di = CM[ci].dataIndx;
					if (fnW = this.getFnW(rd, di)) {
						val = this.execIfDirty(fnW)
					} else {
						val = rd[di];
						if (val == null) val = "";
						else {
							nval = val * 1;
							val = val == nval && (val + "")[0] !== "0" ? nval : val
						}
					}
					arr.push(val);
					_arr2.push(val)
				}
				arr2.push(_arr2);
				_arr2 = []
			}
			arr.get2Arr = function() {
				return arr2
			};
			arr.getRange = function() {
				return {
					r1: r1,
					c1: c1,
					r2: r2,
					c2: c2
				}
			};
			return arr
		}
	}
})(jQuery);
(function($) {
	pq.intel = {
		removeFn: function(text) {
			var len = text.length,
				len2;
			text = text.replace(/[a-z]*\([^()]*\)/gi, "");
			len2 = text.length;
			return len === len2 ? text : this.removeFn(text)
		},
		removeStrings: function(text) {
			text = text.replace(/"[^"]*"/g, "");
			return text.replace(/"[^"]*$/, "")
		},
		getMatch: function(text, exact) {
			var obj = pq.formulas,
				arr = [],
				fn;
			text = text.toUpperCase();
			for (fn in obj) {
				if (exact) {
					if (fn === text) {
						return [fn]
					}
				} else if (fn.indexOf(text) === 0) {
					arr.push(fn)
				}
			}
			return arr
		},
		intel: function(text) {
			text = this.removeStrings(text);
			text = this.removeFn(text);
			var re = /^=(.*[,+\-&*\s(><=])?([a-z]+)((\()[^)]*)?$/i,
				m, fn, exact;
			if (m = text.match(re)) {
				fn = m[2];
				m[4] && (exact = true)
			}
			return [fn, exact]
		},
		movepos: function(val) {
			var m;
			if (m = val.match(/([^a-z].*)/i)) {
				return val.indexOf(m[1]) + 1
			}
			return val.length
		},
		intel3: function(val, pos) {
			if (pos < val.length && /=(.*[,+\-&*\s(><=])?[a-z]+$/i.test(val.slice(0, pos))) {
				pos += this.movepos(val.slice(pos))
			}
			var valPos = val.substr(0, pos),
				fn = this.intel(valPos);
			return fn
		},
		item: function(fn) {
			var desc = this.that.options.strFormulas;
			desc = desc ? desc[fn] : null;
			return "<div>" + (desc ? desc[0] : fn) + "</div>" + (desc ? "<div style='font-size:0.9em;color:#888;margin-bottom:5px;'>" + desc[1] + "</div>" : "")
		},
		popup: function(val, pos, $editor) {
			var $grid = $editor.closest(".pq-grid"),
				$old_intel = $(".pq-intel"),
				$parent = $grid,
				fn, fns, content, arr = this.intel3(val, pos);
			this.that = $grid.pqGrid("instance");
			$old_intel.remove();
			if (fn = arr[0]) {
				fns = this.getMatch(fn, arr[1]);
				content = fns.map(this.item, this).join("");
				if (content) {
					$("<div class='pq-intel' style='width:350px;max-height:300px;overflow:auto;background:#fff;border:1px solid gray;box-shadow: 4px 4px 2px #aaaaaa;padding:5px;'></div>").appendTo($parent).html(content).position({
						my: "center top",
						at: "center bottom",
						collision: "flipfit",
						of: $editor,
						within: $parent
					})
				}
			}
		},
		hide: function() {
			$(".pq-intel").remove()
		}
	}
})(jQuery);
(function($) {
	var f = pq.formulas = {
		evalify: function(arr, cond) {
			var m = cond.match(/([><=]{1,2})?(.*)/),
				m1 = m[1] || "=",
				m2 = m[2],
				reg, ISNUMBER, self = this;
			if (/(\*|\?)/.test(m2)) {
				reg = m2.replace(/\*/g, ".*").replace(/\?/g, "\\S").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
			} else {
				m1 = m1 === "=" ? "==" : m1 === "<>" ? "!=" : m1;
				ISNUMBER = this.ISNUMBER(m2)
			}
			return arr.map(function(val) {
				if (reg) {
					val = val == null ? "" : val;
					val = (m1 === "<>" ? "!" : "") + "/^" + reg + '$/i.test("' + val + '")'
				} else if (ISNUMBER) {
					if (self.ISNUMBER(val)) {
						val = val + m1 + m2
					} else {
						val = "false"
					}
				} else {
					val = val == null ? "" : val;
					val = '"' + (val + "").toUpperCase() + '"' + m1 + '"' + (m2 + "").toUpperCase() + '"'
				}
				return val
			})
		},
		get2Arr: function(arr) {
			return arr.get2Arr ? arr.get2Arr() : arr
		},
		ISNUMBER: function(val) {
			return parseFloat(val) == val
		},
		_reduce: function(arr, arr2) {
			var _arr = [],
				_arr2 = arr2.map(function() {
					return []
				});
			arr.forEach(function(val, indx) {
				if (val != null) {
					val = val * 1;
					if (!isNaN(val)) {
						_arr.push(val);
						_arr2.forEach(function(_a, i) {
							_a.push(arr2[i][indx])
						})
					}
				}
			});
			return [_arr, _arr2]
		},
		reduce: function(arg) {
			arg = this.toArray(arg);
			var arr = arg.shift(),
				arr2 = arg.filter(function(_arr, indx) {
					return indx % 2 == 0
				}),
				a = this._reduce(arr, arr2);
			arr = a[0];
			arr2 = a[1];
			return [arr].concat(arg.map(function(item, indx) {
				return indx % 2 == 0 ? arr2[indx / 2] : arg[indx]
			}))
		},
		strDate1: "(\\d{1,2})/(\\d{1,2})/(\\d{2,4})",
		strDate2: "(\\d{4})-(\\d{1,2})-(\\d{1,2})",
		strTime: "(\\d{1,2})(:(\\d{1,2}))?(:(\\d{1,2}))?(\\s(AM|PM))?",
		isDate: function(val) {
			return this.reDate.test(val) && Date.parse(val) || val && val.constructor == Date
		},
		toArray: function(arg) {
			var arr = [],
				i = 0,
				len = arg.length;
			for (; i < len; i++) {
				arr.push(arg[i])
			}
			return arr
		},
		valueToDate: function(val) {
			var dt = new Date(Date.UTC(1900, 0, 1));
			dt.setUTCDate(dt.getUTCDate() + val - 2);
			return dt
		},
		varToDate: function(val) {
			var val2, mt, m, d, y;
			if (this.ISNUMBER(val)) {
				val2 = this.valueToDate(val)
			} else if (val.getTime) {
				val2 = val
			} else if (typeof val == "string") {
				if (mt = val.match(this.reDateTime)) {
					if (mt[12]) {
						y = mt[13] * 1;
						d = mt[15] * 1;
						m = mt[14] * 1
					} else {
						m = mt[2] * 1;
						d = mt[3] * 1;
						y = mt[4] * 1
					}
				} else if (mt = val.match(this.reDate2)) {
					y = mt[1] * 1;
					d = mt[3] * 1;
					m = mt[2] * 1
				} else if (mt = val.match(this.reDate1)) {
					m = mt[1] * 1;
					d = mt[2] * 1;
					y = mt[3] * 1
				}
				if (mt) {
					val = Date.UTC(y, m - 1, d)
				} else {
					throw "#N/A date"
				}
				val2 = new Date(val)
			}
			return val2
		},
		_IFS: function(arg, fn) {
			var len = arg.length,
				i = 0,
				arr = [],
				a = 0;
			for (; i < len; i = i + 2) {
				arr.push(this.evalify(arg[i], arg[i + 1]))
			}
			var condsIndx = arr[0].length,
				lenArr = len / 2,
				j;
			while (condsIndx--) {
				for (j = 0; j < lenArr; j++) {
					if (!eval(arr[j][condsIndx])) {
						break
					}
				}
				a += j === lenArr ? fn(condsIndx) : 0
			}
			return a
		},
		ABS: function(val) {
			return Math.abs(val.map ? val[0] : val)
		},
		ACOS: function(val) {
			return Math.acos(val)
		},
		AND: function() {
			var arr = this.toArray(arguments);
			return eval(arr.join(" && "))
		},
		ASIN: function(val) {
			return Math.asin(val)
		},
		ATAN: function(val) {
			return Math.atan(val)
		},
		_AVERAGE: function(arr) {
			var count = 0,
				sum = 0;
			arr.forEach(function(val) {
				if (parseFloat(val) == val) {
					sum += val * 1;
					count++
				}
			});
			if (count) {
				return sum / count
			}
			throw "#DIV/0!"
		},
		AVERAGE: function() {
			return this._AVERAGE(pq.flatten(arguments))
		},
		AVERAGEIF: function(range, cond, avg_range) {
			return this.AVERAGEIFS(avg_range || range, range, cond)
		},
		AVERAGEIFS: function() {
			var args = this.reduce(arguments),
				count = 0,
				avg_range = args.shift(),
				sum = this._IFS(args, function(condIndx) {
					count++;
					return avg_range[condIndx]
				});
			if (!count) {
				throw "#DIV/0!"
			}
			return sum / count
		},
		TRUE: true,
		FALSE: false,
		CEILING: function(val) {
			return Math.ceil(val)
		},
		CHAR: function(val) {
			return String.fromCharCode(val)
		},
		CHOOSE: function() {
			var arr = pq.flatten(arguments),
				num = arr[0];
			if (num > 0 && num < arr.length) {
				return arr[num]
			} else {
				throw "#VALUE!"
			}
		},
		CODE: function(val) {
			return (val + "").charCodeAt(0)
		},
		COLUMN: function(val) {
			return (val || this).getRange().c1 + 1
		},
		COLUMNS: function(arr) {
			var r = arr.getRange();
			return r.c2 - r.c1 + 1
		},
		CONCATENATE: function() {
			var arr = pq.flatten(arguments),
				str = "";
			arr.forEach(function(val) {
				str += val
			});
			return str
		},
		COS: function(val) {
			return Math.cos(val)
		},
		_COUNT: function(arg) {
			var arr = pq.flatten(arg),
				self = this,
				empty = 0,
				values = 0,
				numbers = 0;
			arr.forEach(function(val) {
				if (val == null || val === "") {
					empty++
				} else {
					values++;
					if (self.ISNUMBER(val)) {
						numbers++
					}
				}
			});
			return [empty, values, numbers]
		},
		COUNT: function() {
			return this._COUNT(arguments)[2]
		},
		COUNTA: function() {
			return this._COUNT(arguments)[1]
		},
		COUNTBLANK: function() {
			return this._COUNT(arguments)[0]
		},
		COUNTIF: function(range, cond) {
			return this.COUNTIFS(range, cond)
		},
		COUNTIFS: function() {
			return this._IFS(arguments, function() {
				return 1
			})
		},
		DATE: function(year, month, date) {
			if (year < 0 || year > 9999) {
				throw "#NUM!"
			} else if (year <= 1899) {
				year += 1900
			}
			return this.VALUE(new Date(Date.UTC(year, month - 1, date)))
		},
		DATEVALUE: function(val) {
			return this.DATEDIF("1/1/1900", val, "D") + 2
		},
		DATEDIF: function(start, end, unit) {
			var to = this.varToDate(end),
				from = this.varToDate(start),
				months, endTime = to.getTime(),
				startTime = from.getTime(),
				diffDays = (endTime - startTime) / (1e3 * 60 * 60 * 24);
			if (unit === "Y") {
				return parseInt(diffDays / 365)
			} else if (unit === "M") {
				months = to.getUTCMonth() - from.getUTCMonth() + 12 * (to.getUTCFullYear() - from.getUTCFullYear());
				if (from.getUTCDate() > to.getUTCDate()) {
					months--
				}
				return months
			} else if (unit === "D") {
				return diffDays
			} else {
				throw "unit N/A"
			}
		},
		DAY: function(val) {
			return this.varToDate(val).getUTCDate()
		},
		DAYS: function(end, start) {
			return this.DATEDIF(start, end, "D")
		},
		DEGREES: function(val) {
			return 180 / Math.PI * val
		},
		EOMONTH: function(val, i) {
			i = i || 0;
			var dt = this.varToDate(val);
			dt.setUTCMonth(dt.getUTCMonth() + i + 1);
			dt.setUTCDate(0);
			return this.VALUE(dt)
		},
		EXP: function(val) {
			return Math.exp(val)
		},
		FIND: function(val, str, start) {
			return str.indexOf(val, start ? start - 1 : 0) + 1
		},
		FLOOR: function(val, num) {
			if (val * num < 0) {
				return "#NUM!"
			}
			return parseInt(val / num) * num
		},
		HLOOKUP: function(val, arr, row, approx) {
			approx == null && (approx = true);
			arr = this.get2Arr(arr);
			var col = this.MATCH(val, arr[0], approx ? 1 : 0);
			return this.INDEX(arr, row, col)
		},
		HOUR: function(val) {
			if (Date.parse(val)) {
				var d = new Date(val);
				return d.getHours()
			} else {
				return val * 24
			}
		},
		IF: function(cond, truthy, falsy) {
			return cond ? truthy : falsy
		},
		INDEX: function(arr, row, col) {
			arr = this.get2Arr(arr);
			row = row || 1;
			col = col || 1;
			if (typeof arr[0].push == "function") {
				return arr[row - 1][col - 1]
			} else {
				return arr[row > 1 ? row - 1 : col - 1]
			}
		},
		INDIRECT: function(ref) {
			return this.iFormula.range(ref)
		},
		ISBLANK: function(val) {
			return val === ""
		},
		LARGE: function(arr, n) {
			arr.sort();
			return arr[arr.length - (n || 1)]
		},
		LEFT: function(val, x) {
			return val.substr(0, x || 1)
		},
		LEN: function(val) {
			val = (val.map ? val : [val]).map(function(val) {
				return val.length
			});
			return val.length > 1 ? val : val[0]
		},
		LOOKUP: function(val, arr1, arr2) {
			arr2 = arr2 || arr1;
			var col = this.MATCH(val, arr1, 1);
			return this.INDEX(arr2, 1, col)
		},
		LOWER: function(val) {
			return (val + "").toLocaleLowerCase()
		},
		_MAXMIN: function(arr, factor) {
			var max, self = this;
			arr.forEach(function(val) {
				if (val != null) {
					val = self.VALUE(val);
					if (self.ISNUMBER(val) && (val * factor > max * factor || max == null)) {
						max = val
					}
				}
			});
			return max != null ? max : 0
		},
		MATCH: function(val, arr, type) {
			var ISNUMBER = this.ISNUMBER(val),
				_isNumber, indx, _val, i = 0,
				len = arr.length;
			type == null && (type = 1);
			val = ISNUMBER ? val : val.toUpperCase();
			if (type === 0) {
				arr = this.evalify(arr, val + "");
				for (i = 0; i < len; i++) {
					_val = arr[i];
					if (eval(_val)) {
						indx = i + 1;
						break
					}
				}
			} else {
				for (i = 0; i < len; i++) {
					_val = arr[i];
					_isNumber = this.ISNUMBER(_val);
					_val = arr[i] = _isNumber ? _val : _val ? _val.toUpperCase() : "";
					if (val == _val) {
						indx = i + 1;
						break
					}
				}
				if (!indx) {
					for (i = 0; i < len; i++) {
						_val = arr[i];
						_isNumber = this.ISNUMBER(_val);
						if (type * (_val < val ? -1 : 1) === 1 && ISNUMBER == _isNumber) {
							indx = i;
							break
						}
					}
					indx = indx == null ? i : indx
				}
			}
			if (indx) {
				return indx
			}
			throw "#N/A"
		},
		MAX: function() {
			var arr = pq.flatten(arguments);
			return this._MAXMIN(arr, 1)
		},
		MEDIAN: function() {
			var arr = pq.flatten(arguments).filter(function(val) {
					return val * 1 == val
				}).sort(function(a, b) {
					return b - a
				}),
				len = arr.length,
				len2 = len / 2;
			return len2 === parseInt(len2) ? (arr[len2 - 1] + arr[len2]) / 2 : arr[(len - 1) / 2]
		},
		MID: function(val, x, num) {
			if (x < 1 || num < 0) {
				throw "#VALUE!"
			}
			return val.substr(x - 1, num)
		},
		MIN: function() {
			var arr = pq.flatten(arguments);
			return this._MAXMIN(arr, -1)
		},
		MODE: function() {
			var arr = pq.flatten(arguments),
				obj = {},
				freq, rval, rfreq = 0;
			arr.forEach(function(val) {
				freq = obj[val] = obj[val] ? obj[val] + 1 : 1;
				if (rfreq < freq) {
					rfreq = freq;
					rval = val
				}
			});
			if (rfreq < 2) {
				throw "#N/A"
			}
			return rval
		},
		MONTH: function(val) {
			return this.varToDate(val).getUTCMonth() + 1
		},
		OR: function() {
			var arr = this.toArray(arguments);
			return eval(arr.join(" || "))
		},
		PI: function() {
			return Math.PI
		},
		POWER: function(num, pow) {
			return Math.pow(num, pow)
		},
		PRODUCT: function() {
			var arr = pq.flatten(arguments),
				a = 1;
			arr.forEach(function(val) {
				a *= val
			});
			return a
		},
		PROPER: function(val) {
			val = val.replace(/(\S+)/g, function(val) {
				return val.charAt(0).toUpperCase() + val.substr(1).toLowerCase()
			});
			return val
		},
		RADIANS: function(val) {
			return Math.PI / 180 * val
		},
		RAND: function() {
			return Math.random()
		},
		RANK: function(val, arr, order) {
			var r = JSON.stringify(arr.getRange()),
				self = this,
				key = r + "_range";
			arr = this[key] || function() {
				self[key] = arr;
				return arr.sort(function(a, b) {
					return a - b
				})
			}();
			var i = 0,
				len = arr.length;
			for (; i < len; i++) {
				if (val === arr[i]) {
					return order ? i + 1 : len - i
				}
			}
		},
		RATE: function() {},
		REPLACE: function(val, start, num, _char) {
			val += "";
			return val.substr(0, start - 1) + _char + val.substr(start + num - 1)
		},
		REPT: function(val, num) {
			var str = "";
			while (num--) {
				str += val
			}
			return str
		},
		RIGHT: function(val, x) {
			x = x || 1;
			return val.substr(-1 * x, x)
		},
		_ROUND: function(val, digits, fn) {
			var multi = Math.pow(10, digits),
				val2 = val * multi,
				_int = parseInt(val2),
				frac = val2 - _int;
			return fn(_int, frac) / multi
		},
		ROUND: function(val, digits) {
			return this._ROUND(val, digits, function(_int, frac) {
				var absFrac = Math.abs(frac);
				return _int + (absFrac >= .5 ? absFrac / frac : 0)
			})
		},
		ROUNDDOWN: function(val, digits) {
			return this._ROUND(val, digits, function(_int) {
				return _int
			})
		},
		ROUNDUP: function(val, digits) {
			return this._ROUND(val, digits, function(_int, frac) {
				return _int + (frac ? Math.abs(frac) / frac : 0)
			})
		},
		ROW: function(val) {
			return (val || this).getRange().r1 + 1
		},
		ROWS: function(arr) {
			var r = arr.getRange();
			return r.r2 - r.r1 + 1
		},
		SEARCH: function(val, str, start) {
			val = val.toUpperCase();
			str = str.toUpperCase();
			return str.indexOf(val, start ? start - 1 : 0) + 1
		},
		SIN: function(val) {
			return Math.sin(val)
		},
		SMALL: function(arr, n) {
			arr.sort();
			return arr[(n || 1) - 1]
		},
		SQRT: function(val) {
			return Math.sqrt(val)
		},
		_STDEV: function(arr) {
			arr = pq.flatten(arr);
			var len = arr.length,
				avg = this._AVERAGE(arr),
				sum = 0;
			arr.forEach(function(x) {
				sum += (x - avg) * (x - avg)
			});
			return [sum, len]
		},
		STDEV: function() {
			var arr = this._STDEV(arguments);
			if (arr[1] === 1) {
				throw "#DIV/0!"
			}
			return Math.sqrt(arr[0] / (arr[1] - 1))
		},
		STDEVP: function() {
			var arr = this._STDEV(arguments);
			return Math.sqrt(arr[0] / arr[1])
		},
		SUBSTITUTE: function(text, old, new_text, indx) {
			var a = 0;
			return text.replace(new RegExp(old, "g"), function() {
				a++;
				return indx ? a === indx ? new_text : old : new_text
			})
		},
		SUM: function() {
			var arr = pq.flatten(arguments),
				sum = 0,
				self = this;
			arr.forEach(function(val) {
				val = self.VALUE(val);
				if (self.ISNUMBER(val)) {
					sum += parseFloat(val)
				}
			});
			return sum
		},
		SUMIF: function(range, cond, sum_range) {
			return this.SUMIFS(sum_range || range, range, cond)
		},
		SUMIFS: function() {
			var args = this.reduce(arguments),
				sum_range = args.shift();
			return this._IFS(args, function(condIndx) {
				return sum_range[condIndx]
			})
		},
		SUMPRODUCT: function() {
			var arr = this.toArray(arguments);
			arr = arr[0].map(function(val, i) {
				var prod = 1;
				arr.forEach(function(_arr) {
					var val = _arr[i];
					prod *= parseFloat(val) == val ? val : 0
				});
				return prod
			});
			return pq.aggregate.sum(arr)
		},
		TAN: function(val) {
			return Math.tan(val)
		},
		TEXT: function(val, format) {
			if (this.ISNUMBER(val) && format.indexOf("#") >= 0) {
				return pq.formatNumber(val, format)
			} else {
				return $.datepicker.formatDate(pq.excelToJui(format), this.varToDate(val))
			}
		},
		TIME: function(h, m, s) {
			return (h + m / 60 + s / 3600) / 24
		},
		TIMEVALUE: function(val) {
			var m = val.match(this.reTime);
			if (m && m[1] != null && (m[3] != null || m[7] != null)) {
				var mH = m[1] * 1,
					mM = (m[3] || 0) * 1,
					mS = (m[5] || 0) * 1,
					am = (m[7] || "").toUpperCase(),
					v = mH + mM / 60 + mS / 3600
			}
			if (0 <= v && (am && v < 13 || !am && v < 24)) {
				if (am == "PM" && mH < 12) {
					v += 12
				} else if (am == "AM" && mH == 12) {
					v -= 12
				}
				return v / 24
			}
			throw "#VALUE!"
		},
		TODAY: function() {
			var d = new Date;
			return this.VALUE(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())))
		},
		TRIM: function(val) {
			return val.replace(/^\s+|\s+$/gm, "")
		},
		TRUNC: function(val, num) {
			num = Math.pow(10, num || 0);
			return ~~(val * num) / num
		},
		UPPER: function(val) {
			return (val + "").toLocaleUpperCase()
		},
		VALUE: function(val) {
			var m, val2;
			if (!val) {
				val2 = 0
			} else if (parseFloat(val) == val) {
				val2 = parseFloat(val)
			} else if (this.isDate(val)) {
				val2 = this.DATEVALUE(val)
			} else if (m = val.match(this.reDateTime)) {
				var dt = m[1] || m[12],
					t = val.substr(dt.length + 1);
				val2 = this.DATEVALUE(dt) + this.TIMEVALUE(t)
			} else if (m = val.match(this.reTime)) {
				val2 = this.TIMEVALUE(val)
			} else {
				val2 = val.replace(/[^0-9\-.]/g, "");
				val2 = val2.replace(/(\.[1-9]*)0+$/, "$1").replace(/\.$/, "")
			}
			return val2
		},
		VAR: function() {
			var arr = this._STDEV(arguments);
			return arr[0] / (arr[1] - 1)
		},
		VARP: function() {
			var arr = this._STDEV(arguments);
			return arr[0] / arr[1]
		},
		VLOOKUP: function(val, arr, col, approx) {
			approx == null && (approx = true);
			arr = this.get2Arr(arr);
			var arrCol = arr.map(function(arr) {
					return arr[0]
				}),
				row = this.MATCH(val, arrCol, approx ? 1 : 0);
			return this.INDEX(arr, row, col)
		},
		YEAR: function(val) {
			return this.varToDate(val).getUTCFullYear()
		}
	};
	f.reDate1 = new RegExp("^" + f.strDate1 + "$");
	f.reDate2 = new RegExp("^" + f.strDate2 + "$");
	f.reDate = new RegExp("^" + f.strDate1 + "$|^" + f.strDate2 + "$");
	f.reTime = new RegExp("^" + f.strTime + "$", "i");
	f.reDateTime = new RegExp("^(" + f.strDate1 + ")\\s" + f.strTime + "$|^(" + f.strDate2 + ")\\s" + f.strTime + "$")
})(jQuery);
(function($) {
	pq.Select = function(options, $ele) {
		if (this instanceof pq.Select == false) {
			return new pq.Select(options, $ele)
		}
		var $parentGrid = $ele.closest(".pq-grid"),
			$div = $("<div/>").appendTo($parentGrid),
			grid = pq.grid($div, $.extend({
				width: $ele[0].offsetWidth,
				scrollModel: {
					autoFit: true
				},
				height: "flex",
				autoRow: false,
				numberCell: {
					show: false
				},
				hoverMode: "row",
				fillHandle: "",
				stripeRows: false,
				showTop: false,
				showHeader: false
			}, options));
		pq.makePopup($div[0], $ele[0]);
		$div.position({
			my: "left top",
			at: "left bottom",
			of: $ele,
			collision: "flipfit",
			within: $parentGrid
		})
	}
})(jQuery);
(function($) {
	var cPrimary = function(that) {
		this.options = that.options
	};
	cPrimary.prototype = {
		empty: function() {
			for (var key in this) {
				if (key.indexOf("_") == 0) {
					delete this[key]
				}
			}
			delete this.options.dataModel.dataPrimary
		},
		getCM: function() {
			return this._cm
		},
		setCM: function(_cm) {
			this._cm = _cm
		},
		getCols: function() {
			return this._columns
		},
		setCols: function(val) {
			this._columns = val
		},
		getDMData: function() {
			return this.options.dataModel.dataPrimary
		},
		setDMData: function(val) {
			this.options.dataModel.dataPrimary = val
		},
		getOCM: function() {
			return this._ocm
		},
		setOCM: function(v) {
			this._ocm = v
		}
	};
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance,
			p = grid.Group();
		p.primary = new cPrimary(grid);
		grid.on("beforeFilterDone", p.onBeforeFilterDone.bind(p)).one("CMInit", p.oneCMInit.bind(p))
	});
	var old = {},
		_p = {
			clearPivot: function(wholeData) {
				if (this.isPivot()) {
					var that = this.that,
						DM = that.options.dataModel,
						primary = this.primary;
					primary.getOCM() && that.refreshCM(primary.getOCM());
					if (wholeData) {
						if (!primary.getDMData()) {
							throw "!primary.getDMData"
						}
						DM.data = primary.getDMData()
					} else if (primary.getDMData()) {
						DM.data = primary.getDMData()
					}
					this.primary.empty();
					this.setPivot(false);
					return true
				}
			},
			getColsPrimary: function() {
				return this.primary.getCols() || this.that.columns
			},
			getCMPrimary: function() {
				return this.primary.getCM() || this.that.colModel
			},
			getOCMPrimary: function() {
				return this.primary.getOCM() || this.that.options.colModel
			},
			getSumCols: function() {
				var b = ")" + (this.that.options.rtl ? "&lrm;" : "");
				return (old.getSumCols.call(this) || []).map(function(col) {
					return [col.dataIndx, col.dataType, col.summary, col.summary.type + "(" + col.title + b, col.width, col.format, col.showifOpen]
				})
			},
			getVal: function() {
				return this._pivot ? function(rd, di) {
					return rd[di]
				} : old.getVal.apply(this, arguments)
			},
			groupData: function() {
				var self = this,
					that = self.that,
					o = that.options,
					GM = o.groupModel,
					GMdataIndx = GM.dataIndx,
					old_GMdataIndx, oldTitleInFirstCol, oldTitleIndx, oldMerge, groupCols = GM.groupCols,
					primary = self.primary,
					primaryData, groupColsLen = groupCols.length;
				if (GM.pivot) {
					old_GMdataIndx = GMdataIndx.slice();
					GM.dataIndx = GMdataIndx = GMdataIndx.concat(groupCols);
					oldTitleInFirstCol = GM.titleInFirstCol;
					oldTitleIndx = GM.titleIndx;
					oldMerge = GM.merge;
					GM.titleInFirstCol = false;
					GM.titleIndx = null;
					GM.merge = false
				}
				old.groupData.call(self);
				if (GM.pivot) {
					that.pdata = that.pdata.reduce(function(arr, rd) {
						if (rd.pq_gtitle) {
							arr.push(rd)
						}
						return arr
					}, []);
					if (oldTitleIndx) {
						GM.titleInFirstCol = oldTitleInFirstCol;
						GM.titleIndx = oldTitleIndx
					} else if (old_GMdataIndx.length > 1) {
						GM.merge = oldMerge
					}
					self.pivotData(GMdataIndx, old_GMdataIndx);
					GM.dataIndx = old_GMdataIndx.slice(0, old_GMdataIndx.length - 1);
					GM.summaryInTitleRow = "all";
					if (groupColsLen) {
						var di1 = oldTitleIndx,
							di2 = old_GMdataIndx[old_GMdataIndx.length - 1];
						old.groupData.call(self, true);
						if (oldTitleIndx && di1 != di2) that.pdata.forEach(function(rd) {
							if (!rd.pq_gtitle) rd[di1] = rd[di2]
						})
					} else if (oldTitleIndx) {
						that.pdata.forEach(function(rd) {
							rd[oldTitleIndx] = rd[[GMdataIndx[rd.pq_level]]]
						})
					}
					GM.dataIndx = old_GMdataIndx;
					self.setPivot(true)
				}
				that._trigger("groupData")
			},
			isPivot: function() {
				return this._pivot
			},
			getSorter: function(column) {
				var pivotColSortFn = column.pivotSortFn,
					dt;
				if (!pivotColSortFn) {
					dt = pq.getDataType(column);
					pivotColSortFn = dt == "number" ? function(a, b) {
						return a.sortby * 1 > b.sortby * 1 ? 1 : -1
					} : function(a, b) {
						return a.sortby > b.sortby ? 1 : -1
					}
				}
				return pivotColSortFn
			},
			nestedCM: function(sumCols, GM) {
				var self = this,
					groupCols = GM.groupCols,
					pivotColsTotal = GM.pivotColsTotal,
					showifOpenForAggr = pivotColsTotal == "hideifOpen" ? false : null,
					sorters = [],
					dts = [],
					columns = self.that.columns;
				columns = groupCols.map(function(di) {
					var col = columns[di];
					sorters.push(self.getSorter(col));
					dts.push(pq.getDataType(col));
					return col
				});
				return function nestedCM(objCM, level, labelArr) {
					level = level || 0;
					labelArr = labelArr || [];
					var i = 0,
						column, arr, col, dt, title, colModel, aggr, aggrCM, CM = [];
					if ($.isEmptyObject(objCM)) {
						for (; i < sumCols.length; i++) {
							column = sumCols[i];
							arr = labelArr.slice();
							arr.push(column[0]);
							col = {
								dataIndx: arr.join("_"),
								dataType: column[1],
								summary: column[2],
								title: column[3],
								width: column[4],
								format: column[5],
								showifOpen: column[6]
							};
							CM.push(col)
						}
					} else {
						column = columns[level];
						dt = dts[level];
						for (title in objCM) {
							aggr = title === "aggr";
							arr = labelArr.slice();
							arr.push(title);
							colModel = nestedCM(objCM[title], level + 1, arr);
							if (aggr) {
								aggrCM = colModel;
								aggrCM.forEach(function(col) {
									col.showifOpen = showifOpenForAggr;
									col.type = "aggr"
								})
							} else {
								col = {
									showifOpen: true,
									sortby: title,
									title: pq.format(column, title, dt),
									colModel: colModel
								};
								if (colModel.length > 1 && !colModel.find(function(col) {
										return !col.type
									}).dataIndx) {
									col.collapsible = {
										on: true,
										last: null
									}
								}
								CM.push(col)
							}
						}
						CM.sort(sorters[level]);
						if (aggrCM) CM[pivotColsTotal == "before" ? "unshift" : "push"].apply(CM, aggrCM)
					}
					return CM
				}
			},
			onBeforeFilterDone: function(evt, ui) {
				if (this.isPivot()) {
					var rules = ui.rules,
						cols = this.primary.getCols(),
						i = 0,
						rule;
					for (; i < rules.length; i++) {
						rule = rules[i];
						if (!cols[rule.dataIndx]) {
							return false
						}
					}
					this.clearPivot(true);
					ui.header = true
				}
			},
			oneCMInit: function() {
				this.updateAgg(this.that.options.groupModel.agg)
			},
			option: function(ui, refresh, source, fn) {
				var self = this;
				if (self.isPivot()) {
					self.clearPivot()
				}
				old.option.call(self, ui, refresh, source, fn)
			},
			pivotData: function(GPMdataIndx, GMdataIndx) {
				var that = this.that,
					sumCols = this.getSumCols(),
					sumDIs = this.getSumDIs(),
					o = that.options,
					GM = o.groupModel,
					primary = this.primary,
					data = that.pdata,
					columns = that.columns,
					col0, titleIndx = GM.titleIndx,
					CM;
				if (titleIndx) {
					col0 = columns[titleIndx];
					CM = [col0].concat(GMdataIndx.reduce(function(_CM, di) {
						if (di != titleIndx) {
							_CM.push($.extend({
								hidden: true
							}, columns[di]))
						}
						return _CM
					}, []))
				} else {
					CM = GMdataIndx.map(function(di) {
						return columns[di]
					})
				}
				var objCM = this.transformData(data, sumDIs, GPMdataIndx, GMdataIndx),
					CM2 = this.nestedCM(sumCols, GM)(objCM),
					ui = {};
				ui.CM = CM = CM.concat(CM2);
				that._trigger("pivotCM", null, ui);
				primary.setOCM(o.colModel);
				primary.setCM(that.colModel);
				primary.setCols(that.columns);
				that.refreshCM(ui.CM, {
					pivot: true
				})
			},
			setPivot: function(val) {
				this._pivot = val
			},
			transformData: function(data, sumDIs, GPMdataIndx, GMdataIndx) {
				var self = this,
					add, prev_level, pdata = [],
					new_rd, that = this.that,
					primary = this.primary,
					masterRow = {},
					arr, labelArr = [],
					o = that.options,
					DM = o.dataModel,
					GM = o.groupModel,
					pivotColsTotal = GM.pivotColsTotal,
					GMLen = GMdataIndx.length,
					objCM = {},
					GPMLen = GPMdataIndx.length;
				if (GMLen == GPMLen) {
					data.forEach(function(rd) {
						if (rd.pq_level == GMLen - 1) {
							delete rd.children;
							delete rd.pq_gtitle
						}
					});
					self.updateItems(data);
					pdata = data
				} else {
					data.forEach(function(rd) {
						var level = rd.pq_level,
							PM_level = level - GMLen,
							_objCM = objCM,
							di = GPMdataIndx[level],
							val = rd[di],
							i, _val;
						if (PM_level >= 0) {
							labelArr[PM_level] = val;
							for (i = 0; i < PM_level + 1; i++) {
								_val = labelArr[i];
								_objCM = _objCM[_val] = _objCM[_val] || {}
							}
						}
						if (level === GPMLen - 1) {
							sumDIs.forEach(function(sumDI) {
								arr = labelArr.slice();
								arr.push(sumDI);
								new_rd[arr.join("_")] = rd[sumDI]
							})
						} else {
							if (!new_rd || prev_level > level && level < GMLen) {
								new_rd = {
									pq_gid: self.idCount++
								};
								add = true
							}
							if (level < GMLen) {
								masterRow[di] = new_rd[di] = val
							}
							if (pivotColsTotal) {
								if (level <= GPMLen - 2 && level >= GMLen - 1) {
									sumDIs.forEach(function(sumDI) {
										arr = labelArr.slice(0, PM_level + 1);
										arr.push("aggr");
										arr.push(sumDI);
										new_rd[arr.join("_")] = rd[sumDI]
									})
								}
							}
						}
						prev_level = level;
						if (add) {
							pdata.push(new_rd);
							GMdataIndx.forEach(function(di) {
								if (new_rd[di] === undefined) {
									new_rd[di] = masterRow[di]
								}
							});
							add = false
						}
					})
				}
				primary.setDMData(DM.data);
				DM.data = that.pdata = pdata;
				if (pivotColsTotal) this.addAggrInCM(objCM, GM.pivotTotalForSingle);
				return objCM
			},
			addAggrInCM: function(CM, pivotTotalForSingle) {
				var count = 0,
					key;
				for (key in CM) {
					count++;
					this.addAggrInCM(CM[key], pivotTotalForSingle)
				}
				if (count > (pivotTotalForSingle ? 0 : 1)) {
					CM.aggr = {}
				}
			},
			updateAgg: function(agg, oldAgg) {
				var cols = this.that.columns,
					key;
				if (oldAgg) {
					for (key in oldAgg) {
						cols[key].summary = null
					}
				}
				if (agg) {
					for (key in agg) {
						cols[key].summary = {
							type: agg[key]
						}
					}
				}
			}
		},
		p = $.paramquery.cGroup.prototype;
	for (var method in _p) {
		old[method] = p[method];
		p[method] = _p[method]
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.pqGrid.defaults.toolPanel = {};
	_pq.pqGrid.prototype.ToolPanel = function() {
		return this.iToolPanel
	};
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iToolPanel = new _pq.cToolPanel(grid)
	});
	_pq.cToolPanel = function(that) {
		var self = this;
		self.that = that;
		self.panes = [];
		self.clsSort = "pq-sortable";
		that.one("render", self.init.bind(self))
	};
	_pq.cToolPanel.prototype = {
		getArray: function($ele) {
			return $ele.find(".pq-pivot-col").get().map(function(col) {
				return col.dataset.di
			})
		},
		getInit: function() {
			return this._inited
		},
		getObj: function($ele) {
			var obj = {};
			$ele.find(".pq-pivot-col").each(function(i, col) {
				obj[col.dataset.di] = col.getAttribute("type") || "sum"
			});
			return obj
		},
		getSortCancel: function() {
			return this._sortCancel
		},
		_hide: function(hide) {
			this.$ele[hide ? "hide" : "show"]();
			this.init();
			this.that.refresh({
				soft: true
			})
		},
		hide: function() {
			this._hide(true)
		},
		init: function() {
			var self = this,
				$ele = self.$ele = self.that.$toolPanel;
			if (self.isVisible() && !self.getInit()) {
				var that = self.that,
					o = that.options,
					TPM = o.toolPanel,
					pivot = o.groupModel.pivot,
					labelCls = " pq-pivot-label pq-bg-3 ",
					cls = " pq-pivot-pane pq-border-1 ",
					hideColPane = self.isHideColPane(),
					hidePivotChkBox = TPM.hidePivotChkBox,
					pivot_checked = pivot ? "checked" : "",
					clsSort = self.clsSort;
				$ele.html(["<div class='pq-pivot-cols-all", cls, "'>", "<div class='", clsSort, "' style='", hidePivotChkBox ? "padding-top:0;" : "", "'></div>", hidePivotChkBox ? "" : ["<div class='", labelCls, "'>", "<label><input type='checkbox' class='pq-pivot-checkbox' ", pivot_checked, "/>", o.strTP_pivot, "</label>", "</div>"].join(""), "</div>", "<div class='pq-pivot-rows", cls, "' style='display:", TPM.hideRowPane ? "none" : "", ";'>", "<div deny='denyGroup' class='", clsSort, "'></div>", "<div class='", labelCls, "'><span class='pq-icon'></span>", o.strTP_rowPane, "</div>", "</div>", "<div class='pq-pivot-cols", cls, "' style='display:", hideColPane ? "none" : "", ";'>", "<div deny='denyPivot' class='", clsSort, "'></div>", "<div class='", labelCls, "'><span class='pq-icon'></span>", o.strTP_colPane, "</div>", "</div>", "<div class='pq-pivot-vals", cls, "' style='display:", TPM.hideAggPane ? "none" : "", ";'>", "<div deny='denyAgg' class='", clsSort, "'></div>", "<div class='", labelCls, "'><span class='pq-icon'></span>", o.strTP_aggPane, "</div>", "</div>"].join(""));
				self.$pivotChk = $ele.find(".pq-pivot-checkbox").on("click", self.onPivotChange(self, that));
				self.$colsAll = $ele.find(".pq-pivot-cols-all>." + clsSort);
				self.$colsPane = $ele.find(".pq-pivot-cols");
				self.$cols = $ele.find(".pq-pivot-cols>." + clsSort);
				self.$rows = $ele.find(".pq-pivot-rows>." + clsSort);
				self.$aggs = $ele.find(".pq-pivot-vals>." + clsSort).on("click contextmenu", self.onClick.bind(self));
				that.on("refreshFull", self.setHt.bind(self)).on("groupOption", self.onGroupOption.bind(self));
				setTimeout(function() {
					if (that.element) {
						that.on("CMInit", self.onCMInit.bind(self));
						self.render()
					}
				});
				self.setInit()
			}
		},
		isHideColPane: function() {
			var o = this.that.options;
			return o.toolPanel.hideColPane || !o.groupModel.pivot
		},
		isDeny: function($source, $dest, $item) {
			var deny = $dest.attr("deny"),
				that = this.that,
				columns = that.iGroup.getColsPrimary(),
				col = columns[$item[0].dataset.di];
			return col[deny]
		},
		isVisible: function() {
			return this.$ele.is(":visible")
		},
		onCMInit: function(evt, ui) {
			if (!ui.pivot && !ui.flex && !ui.group && !this.that.Group().isPivot()) this.refresh()
		},
		onClick: function(evt) {
			var $target = $(evt.target),
				self = this,
				that = self.that;
			if ($target.hasClass("pq-pivot-col")) {
				var di = $target[0].dataset.di,
					col = that.iGroup.getColsPrimary()[di],
					aggOptions = that.iGroup.getAggOptions(col.dataType).sort(),
					options = {
						dataModel: {
							data: aggOptions.map(function(item) {
								return [item]
							})
						},
						cellClick: function(evt, ui) {
							var type = ui.rowData[0],
								self2 = this;
							$target.attr("type", type);
							setTimeout(function() {
								self2.destroy();
								self.refreshGrid();
								self.refresh()
							})
						}
					};
				pq.Select(options, $target);
				return false
			}
		},
		onGroupOption: function(evt, ui) {
			if (ui.source != "tp") {
				var oldGM = ui.oldGM,
					GM = this.that.options.groupModel;
				if (GM.groupCols != oldGM.groupCols || GM.agg != oldGM.agg || GM.dataIndx != oldGM.dataIndx || GM.pivot != oldGM.pivot) this.refresh()
			}
		},
		onPivotChange: function(self, that) {
			return function() {
				var pivot = !!this.checked,
					ui = {
						pivot: pivot
					};
				that.Group().option(ui, null, "tp");
				self.showHideColPane()
			}
		},
		ph: function(str) {
			return "<span style='color:#999;margin:1px;display:inline-block;'>" + str + "</span>"
		},
		refreshGrid: function() {
			var self = this,
				that = self.that,
				cols = self.getArray(self.$cols),
				aggs = self.getObj(self.$aggs),
				rows = self.getArray(self.$rows);
			that.Group().option({
				groupCols: cols,
				dataIndx: rows,
				agg: aggs
			}, null, "tp");
			setTimeout(function() {
				self.refresh()
			})
		},
		onReceive: function(evt, ui) {
			if (this.getSortCancel()) {
				return this.setSortCancel(false)
			}
			this.refreshGrid()
		},
		onOver: function(self) {
			return function(evt, ui) {
				var $dest = $(this),
					$item = ui.item,
					$source = $item.parent(),
					add = "addClass",
					remove = "removeClass",
					isDeny = $source[0] != $dest[0] ? self.isDeny($source, $dest, $item) : false;
				ui.helper.find(".ui-icon")[isDeny ? add : remove]("ui-icon-closethick")[isDeny ? remove : add]("ui-icon-check")
			}
		},
		onStop: function(self) {
			return function(evt, ui) {
				var $source = $(this),
					$item = ui.item,
					$dest = $item.parent();
				if ($source[0] != $dest[0]) {
					if (self.isDeny($source, $dest, $item)) {
						$source.sortable("cancel");
						self.setSortCancel(true)
					}
				}
			}
		},
		onTimer: function() {
			var timeID;
			return function(evt, ui) {
				clearTimeout(timeID);
				var self = this;
				timeID = setTimeout(function() {
					self.onReceive(evt, ui)
				})
			}
		}(),
		refresh: function() {
			var self = this;
			if (self.that.element.is(":visible")) {
				self.setHtml();
				$(self.panes).sortable("refresh")
			} else self.pendingRefresh = true
		},
		render: function() {
			var self = this,
				connectSort = "." + self.clsSort,
				that = self.that;
			if (!that.element) {
				return
			}
			self.panes = [self.$colsAll, self.$cols, self.$rows, self.$aggs];
			self.setHtml();
			$(self.panes).sortable({
				appendTo: self.$ele,
				connectWith: connectSort,
				containment: self.$ele,
				cursor: "move",
				items: "> .pq-pivot-col:not('.pq-deny-drag')",
				helper: function(evt, ele) {
					return ele.clone(true).css({
						opacity: "0.8"
					}).prepend("<span class='ui-icon-check ui-icon'></span>")
				},
				receive: self.onTimer.bind(self),
				stop: self.onStop(self),
				over: self.onOver(self),
				update: self.onTimer.bind(self),
				tolerance: "pointer"
			});
			that._trigger("tpRender")
		},
		setHtml: function() {
			var self = this,
				that = self.that,
				htmlColsAll = [],
				htmlCols = [],
				htmlRows = [],
				htmlVals = [],
				template = self.template,
				templateVals = self.templateVals,
				objGPM = {},
				o = that.options,
				Group = that.iGroup,
				columns = Group.getColsPrimary(),
				CM = Group.getCMPrimary(),
				col, di, GM = o.groupModel,
				GMdataIndx = GM.dataIndx,
				groupCols = GM.groupCols,
				i = 0,
				clen = CM.length,
				pivotChk = self.$pivotChk[0];
			GMdataIndx.concat(groupCols).forEach(function(di) {
				objGPM[di] = 1
			});
			if (pivotChk) pivotChk.checked = GM.pivot;
			self.showHideColPane();
			for (; i < clen; i++) {
				col = CM[i];
				di = col.dataIndx;
				if (col.tpHide || objGPM[di]) {} else if (col.summary && col.summary.type) {
					htmlVals.push(templateVals(di, col))
				} else {
					htmlColsAll.push(template(di, col))
				}
			}
			GMdataIndx.forEach(function(di) {
				htmlRows.push(template(di, columns[di]))
			});
			groupCols.forEach(function(di) {
				htmlCols.push(template(di, columns[di]))
			});
			self.$colsAll.html(htmlColsAll.join(""));
			self.$rows.html(htmlRows.join("") || self.ph(o.strTP_rowPH));
			self.$cols.html(htmlCols.join("") || self.ph(o.strTP_colPH));
			self.$aggs.html(htmlVals.join("") || self.ph(o.strTP_aggPH))
		},
		setAttrPanes: function() {
			this.$ele.attr("panes", this.panes.filter(function($ele) {
				return $ele.is(":visible")
			}).length)
		},
		setHt: function() {
			var self = this;
			self.$ele.height(this.$ele.parent()[0].offsetHeight);
			if (self.pendingRefresh) {
				self.pendingRefresh = false;
				self.refresh()
			}
		},
		setSortCancel: function(val) {
			this._sortCancel = val
		},
		setInit: function() {
			this._inited = true
		},
		show: function() {
			this._hide(false)
		},
		showHideColPane: function() {
			var self = this;
			self.$colsPane.css("display", self.isHideColPane() ? "none" : "");
			self.setAttrPanes()
		},
		template: function(di, col) {
			return ["<div data-di='", di, "' class='pq-pivot-col pq-border-2 ", col.tpCls || "", "'>", col.title, "</div>"].join("")
		},
		templateVals: function(di, col) {
			var type = col.summary.type;
			return ["<div data-di='", di, "' type='", type, "' class='pq-pivot-col pq-border-2 ", col.tpCls || "", "'>", type, "(", col.title, ")</div>"].join("")
		},
		toggle: function() {
			this._hide(this.isVisible())
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iHeaderMenu = new cHeaderMenu(grid);
		grid.HeaderMenu = function() {
			return grid.iHeaderMenu
		}
	});

	function cHeaderMenu(that) {
		var self = this;
		self.that = that;
		self.rtl = that.options.rtl;
		that.on("headerCellClick", self.onHeadCellClick.bind(self)).on("headerClick", self.onHeadClick.bind(self)).on("destroy", self.onDestroy.bind(self))
	}
	cHeaderMenu.prototype = {
		close: function() {
			this.$popup.remove();
			this.$popup = null
		},
		popup: function() {
			return this.$popup
		},
		openFilterTab: function() {
			var index = this.$popup.find("a[href='tabs-filter']").closest("li").index();
			this.$tabs.tabs("option", "active", index);
			return this.filterMenu
		},
		FilterMenu: function() {
			return this.filterMenu
		},
		getCM: function() {
			var title = this.that.options.strSelectAll || "Select All",
				n = null,
				nested = this.nested,
				col1 = {
					editor: false,
					dataIndx: "title",
					title: title,
					useLabel: true,
					filter: {
						crules: [{
							condition: "contain"
						}]
					},
					type: nested ? n : "checkbox",
					cbId: nested ? n : "visible"
				},
				col2 = {
					hidden: true,
					dataIndx: "visible",
					dataType: "bool",
					editable: function(ui) {
						return !ui.rowData.pq_disable
					},
					cb: nested ? n : {
						header: true
					}
				};
			return [col1, col2]
		},
		getData: function() {
			var id = 1,
				self = this,
				that = self.that,
				iRH = that.iRenderHead;
			return that.Columns().reduce(function(col) {
				var ci = this.getColIndx({
						column: col
					}),
					visible = !col.hidden,
					hasChild = col.childCount;
				if (!col.menuInHide && !col.collapsible) {
					if (hasChild) {
						self.nested = true
					}
					return {
						visible: hasChild ? undefined : visible,
						title: hasChild ? col.title : iRH.getTitle(col, ci) || col.dataIndx,
						column: col,
						id: id++,
						pq_disable: col.menuInDisable,
						pq_close: col.menuInClose,
						colModel: hasChild ? col.colModel : undefined
					}
				}
			})
		},
		getGridObj: function() {
			var self = this,
				gridOptions = "gridOptions",
				that = self.that;
			return $.extend({
				dataModel: {
					data: self.getData()
				},
				rtl: that.options.rtl,
				colModel: self.getCM(),
				check: self.onChange.bind(self),
				treeExpand: self.onTreeExpand.bind(self),
				treeModel: self.nested ? {
					dataIndx: "title",
					childstr: "colModel",
					checkbox: true,
					checkboxHead: true,
					cbId: "visible",
					cascade: true,
					useLabel: true
				} : undefined
			}, that.options.menuUI[gridOptions])
		},
		onChange: function(evt, ui) {
			if (ui.init) {
				return
			}
			var diShow = [],
				diHide = [];
			(ui.getCascadeList ? ui.getCascadeList() : ui.rows).forEach(function(obj) {
				var rd = obj.rowData,
					visible = rd.visible,
					column = rd.column,
					di = column.dataIndx,
					CM = column.colModel;
				if (!CM || !CM.length) {
					if (visible) diShow.push(di);
					else diHide.push(di)
				}
			});
			this.that.Columns().hide({
				diShow: diShow,
				diHide: diHide
			})
		},
		onDestroy: function() {
			var $popup = this.$popup;
			if ($popup) $popup.remove();
			delete this.$popup
		},
		onHeadCellClick: function(evt, ui) {
			var self = this,
				$target = $(evt.originalEvent.target);
			if ($target.hasClass("pq-filter-icon")) {
				return self.onFilterClick(evt, ui, $target)
			} else if ($target.hasClass("pq-menu-icon")) {
				return self.onMenuClick(evt, ui, $target)
			}
		},
		onHeadClick: function(evt, ui) {
			if (this.that.getColModel().find(function(col) {
					return !col.hidden
				}) == null) {
				return this.onMenuClick(evt, ui)
			}
		},
		getMenuHtml: function(tabs) {
			var icons = {
					hideCols: "visible",
					filter: "filter"
				},
				li = tabs.map(function(tab) {
					return ['<li><a href="#tabs-', tab, '"><span class="pq-tab-', icons[tab], '-icon">&nbsp;</span></a></li>'].join("")
				}).join(""),
				div = tabs.map(function(tab) {
					return '<div id="tabs-' + tab + '"></div>'
				}).join("");
			return ["<div class='pq-head-menu pq-theme' dir='", this.rtl ? "rtl" : "ltr", "'>", "<div class='pq-tabs' style='border-width:0;'>", "<ul>", li, "</ul>", div, "</div>", "</div>"].join("")
		},
		getMenuH: function(options, column) {
			return $.extend({}, options.menuUI, column.menuUI)
		},
		open: function(di, evt, $target) {
			var self = this,
				that = self.that,
				menuH, tabs, column;
			evt = evt || that.getCellHeader({
				dataIndx: di
			});
			if (di != null) {
				column = that.columns[di];
				menuH = self.menuH = self.getMenuH(that.options, column);
				tabs = menuH.tabs
			} else {
				tabs = ["hideCols"]
			}
			var $popup = self.$popup = $(self.getMenuHtml(tabs)).appendTo(document.body),
				$tabs = this.$tabs = $popup.find(".pq-tabs");
			if (tabs.indexOf("hideCols") > -1) {
				var $grid = self.$grid = $("<div/>").appendTo($popup.find("#tabs-hideCols"));
				self.grid = pq.grid($grid, self.getGridObj())
			}
			if (tabs.indexOf("filter") > -1) {
				self.appendFilter($popup.find("#tabs-filter"), column)
			}
			pq.makePopup(self.$popup[0]);
			$tabs.tabs({
				active: localStorage["pq-menu-tab"] || 1,
				activate: function(evt, ui) {
					localStorage["pq-menu-tab"] = $(this).tabs("option", "active");
					$(ui.newPanel).find(".pq-grid").pqGrid("refresh")
				}
			});
			$popup.resizable({
				handles: "e,w",
				maxWidth: 600,
				minWidth: 220
			});
			$popup.position({
				my: "left top",
				at: "left bottom",
				of: $target || evt
			});
			return this
		},
		onMenuClick: function(evt, ui, $target) {
			this.open(ui.dataIndx, evt, $target);
			return false
		},
		onTreeExpand: function(evt, ui) {
			ui.nodes.forEach(function(rd) {
				rd.column.menuInClose = ui.close
			})
		},
		appendFilter: function($cont, column) {
			var self = this,
				grid = self.that,
				$div = $("<div class='pq-filter-menu pq-theme'/>").appendTo($cont),
				$popup = self.$popup || $div,
				filterMenu, html;
			filterMenu = self.filterMenu = new pq.cFilterMenu;
			var ui2 = {
				filterRow: $cont.is(document.body),
				grid: grid,
				column: column,
				$popup: $popup,
				menuH: this.menuH || this.getMenuH(grid.options, column)
			};
			filterMenu.init(ui2);
			html = filterMenu.getHtml();
			$div.html(html);
			filterMenu.ready($div.children().get());
			filterMenu.addEvents();
			$popup.on("remove", function() {
				self.$popup = self.filterMenu = null
			});
			return $div
		},
		onFilterClick: function(evt, ui, $target) {
			var $div = this.$popup = this.appendFilter($(document.body), ui.column);
			pq.makePopup($div[0]);
			$div.position({
				my: "left top",
				at: "left bottom",
				of: $target
			});
			return false
		}
	}
})(jQuery);
(function($) {
	var cFilterMenu = pq.cFilterMenu = function() {};
	cFilterMenu.select = function(that, column) {
		this.that = that;
		this.di1 = "selected", this.grid = null;
		this.column = column
	};
	cFilterMenu.select.prototype = {
		change: function(applyFilter) {
			this.onChange(applyFilter).call(this.grid)
		},
		create: function($grid, filterUI, btnOk) {
			var self = this,
				that = self.that,
				obj = self.getGridObj(filterUI, btnOk),
				trigger = function(evtName) {
					var cb = filterUI[evtName];
					cb && cb.call(that, ui);
					that._trigger(evtName, null, ui)
				},
				ui = $.extend({
					obj: obj,
					column: self.column
				}, filterUI);
			trigger("selectGridObj");
			obj.rtl = that.options.rtl;
			ui.grid = self.grid = pq.grid($grid, obj);
			trigger("selectGridCreated");
			return self.grid
		},
		getCM: function(column, di1, groupIndx, labelIndx, maxCheck, filterUI) {
			var di = column.dataIndx,
				col = $.extend({
					filter: {
						crules: [{
							condition: "contain"
						}]
					},
					align: "left",
					format: filterUI.format || column.format,
					deFormat: column.deFormat,
					title: column.pq_title || column.title,
					dataType: column.dataType,
					dataIndx: di,
					editor: false,
					useLabel: true,
					renderLabel: this.getRenderLbl(labelIndx, di, this.that.options.strBlanks)
				}, groupIndx ? {} : {
					type: "checkbox",
					cbId: di1
				});
			return groupIndx ? [col, {
				dataIndx: di1,
				dataType: "bool",
				hidden: true
			}, {
				dataIndx: groupIndx,
				hidden: true
			}] : [col, {
				dataIndx: di1,
				dataType: "bool",
				hidden: true,
				cb: {
					header: !maxCheck,
					maxCheck: maxCheck
				}
			}]
		},
		getData: function(filterUI, filter) {
			var column = this.column,
				grid = this.that,
				valObj = {},
				di1 = this.di1,
				di = column.dataIndx,
				maxCheck = filterUI.maxCheck,
				value = pq.filter.getVal(filter)[0],
				options = pq.filter.getOptions(column, filterUI, grid, true);
			if (!$.isArray(value)) {
				if (maxCheck == 1) {
					value = [value]
				} else {
					value = []
				}
			} else if (maxCheck) {
				value = value.slice(0, maxCheck)
			}
			value.forEach(function(val) {
				valObj[val] = true
			});
			if (value.length) {
				options.forEach(function(rd) {
					rd[di1] = valObj[rd[di]]
				})
			} else {
				options.forEach(function(rd) {
					rd[di1] = !maxCheck
				})
			}
			return options
		},
		getGridObj: function(filterUI, btnOk) {
			var self = this,
				column = self.column,
				options = self.that.options,
				filter = column.filter,
				gridOptions = "gridOptions",
				groupIndx = filterUI.groupIndx,
				maxCheck = filterUI.maxCheck,
				di1 = self.di1,
				data = self.getData(filterUI, filter),
				labelIndx = data && data.length && data[0].pq_label != null ? "pq_label" : filterUI.labelIndx;
			self.filterUI = filterUI;
			return $.extend({
				colModel: self.getCM(column, di1, groupIndx, labelIndx, maxCheck, filterUI),
				check: self.onChange(!btnOk),
				filterModel: column.dataType === "bool" ? {} : undefined,
				groupModel: groupIndx ? {
					on: true,
					dataIndx: groupIndx ? [groupIndx] : [],
					titleInFirstCol: true,
					fixCols: false,
					indent: 18,
					checkbox: true,
					select: false,
					checkboxHead: !maxCheck,
					cascade: !maxCheck,
					maxCheck: maxCheck,
					cbId: di1
				} : {},
				dataModel: {
					data: data
				}
			}, options.menuUI[gridOptions], options.filterModel[gridOptions], filterUI[gridOptions])
		},
		getRenderLbl: function(labelIndx, di, strBlanks) {
			if (labelIndx === di) labelIndx = undefined;
			return function(ui) {
				var rd = ui.rowData,
					val = rd[labelIndx];
				return !val && rd[di] === "" ? strBlanks : val
			}
		},
		onChange: function(applyFilter) {
			var self = this,
				filterUI = self.filterUI,
				maxCheck = filterUI.maxCheck,
				cond = filterUI.condition;
			return function() {
				if (applyFilter) {
					var filtered = false,
						column = self.column,
						di = column.dataIndx,
						di1 = self.di1,
						grid = self.that,
						value = this.getData().filter(function(rd) {
							var selected = rd[di1];
							if (!selected) {
								filtered = true
							}
							return selected
						}).map(function(rd) {
							return rd[di]
						});
					if (filtered) {
						grid.filter({
							oper: "add",
							rule: {
								dataIndx: di,
								condition: cond,
								value: value
							}
						})
					} else {
						grid.filter({
							rule: {
								dataIndx: di,
								condition: cond,
								value: []
							}
						})
					}
					self.refreshRowFilter()
				}
			}
		},
		refreshRowFilter: function() {
			this.that.iRenderHead.postRenderCell(this.column)
		}
	};
	cFilterMenu.prototype = {
		addEvents: function() {
			var self = this;
			self.$sel0.on("change", self.onSel1Change.bind(self));
			self.$sel1.on("change", self.onSel2Change.bind(self));
			self.$filter_mode.on("change", self.onModeChange.bind(self));
			self.$clear.button().on("click", self.clear.bind(self));
			self.$ok.button().on("click", self.ok.bind(self))
		},
		addEventsInput: function() {
			var self = this;
			if (self.$inp) {
				self.$inp.filter("[type='checkbox']").off("click").on("click", self.onInput.bind(self));
				self.$inp.filter("[type='text']").off("keyup").on("keyup", self.onInput.bind(self))
			}
		},
		clear: function() {
			var grid = this.that,
				column = this.column,
				cond = this.cond0,
				type = this.getType(cond),
				di = column.dataIndx;
			grid.filter({
				rule: {
					dataIndx: di,
					condition: type ? cond : undefined
				},
				oper: "remove"
			});
			this.refreshRowFilter();
			this.ready()
		},
		close: function() {
			this.$popup.remove()
		},
		filterByCond: function(filter) {
			var self = this,
				grid = self.that,
				column = self.column,
				di = column.dataIndx,
				cond0 = self.cond0,
				remove = cond0 === "",
				cond1 = self.cond1,
				filterRow = self.filterRow;
			self.showHide(cond0, cond1);
			if (!filterRow) {
				var mode = self.getModeVal(),
					type = self.getType(cond0),
					arr0 = self.getVal(0),
					value = arr0[0],
					value2 = arr0[1],
					arr1 = self.getVal(1),
					value21 = arr1[0],
					value22 = arr1[1],
					$gridR = self.$gridR
			}
			if (type == "select") {
				filter && grid.filter({
					oper: "add",
					rule: {
						dataIndx: di,
						condition: cond0,
						value: []
					}
				});
				if (!filterRow) {
					self.iRange.create($gridR, self.filterUI[0], self.btnOk)
				}
			} else {
				filter && grid.filter({
					oper: remove ? "remove" : "add",
					rule: {
						dataIndx: di,
						mode: mode,
						crules: [{
							condition: cond0,
							value: value,
							value2: value2
						}, {
							condition: cond1,
							value: value21,
							value2: value22
						}]
					}
				})
			}
		},
		getBtnOk: function() {
			return this.$ok
		},
		getInp: function(indx) {
			return this["$inp" + indx]
		},
		getSel: function(indx) {
			return this["$sel" + indx]
		},
		getBtnClear: function() {
			return this.$clear
		},
		getHtmlInput: function(indx) {
			var name = this.column.dataIndx,
				filterUI = this.filterUI[indx < 2 ? 0 : 1],
				chk = "checkbox",
				type = filterUI.type == chk ? chk : "text",
				cls = filterUI.cls || "",
				style = filterUI.style || "",
				attr = filterUI.attr || "",
				attrStr = ["name='", name, "' class='", cls, "' style='width:100%;", style, "display:none;' ", attr].join("");
			return "<input type='" + type + "' " + attrStr + " />"
		},
		getHtml: function() {
			var self = this,
				column = self.column,
				filter = column.filter,
				menuH = self.menuH,
				rules = filter.crules || [],
				rule0 = rules[0] || filter,
				rule1 = rules[1] || {},
				options = self.that.options,
				cond0 = self.cond0 = rule0.condition,
				cond1 = self.cond1 = rule1.condition,
				filterRow = self.filterRow;
			self.readFilterUI();
			var textFields = function(indx1, indx2) {
					return ["<div style='margin:0 auto 4px;'>", self.getHtmlInput(indx1), "</div>", "<div style='margin:0 auto 4px;'>", self.getHtmlInput(indx2), "</div>"].join("")
				},
				conds = pq.filter.getConditionsCol(this.column, self.filterUI[0]);
			return ["<div style='padding:4px;'>", "<div style='margin:0 auto 4px;'>", options.strCondition, " <select>", this.getOptionStr(conds, cond0), "</select></div>", filterRow ? "" : ["<div>", textFields(0, 1), "<div data-rel='grid' style='display:none;'></div>", menuH.singleFilter ? "" : ["<div class='filter_mode_div' style='text-align:center;display:none;margin:4px 0 4px;'>", "<label><input type='radio' name='pq_filter_mode' value='AND'/>AND</label>&nbsp;", "<label><input type='radio' name='pq_filter_mode' value='OR'/>OR</label>", "</div>", "<div style='margin:0 auto 4px;'><select>", this.getOptionStr(conds, cond1, true), "</select></div>", textFields(2, 3)].join(""), "</div>"].join(""), "<div style='margin:4px 0 0;'>", menuH.buttons.map(function(button) {
				return "<button data-rel='" + button + "' type='button' style='width:calc(50% - 4px);margin:2px;' >" + (options["str" + pq.cap1(button)] || button) + "</button>"
			}).join(""), "</div>", "</div>"].join("")
		},
		getMode: function(indx) {
			var $fm = this.$filter_mode;
			return indx >= 0 ? $fm[indx] : $fm
		},
		getModeVal: function() {
			return this.$filter_mode.filter(":checked").val()
		},
		getOptionStr: function(conditions, _cond, excludeSelect) {
			var options = [""].concat(conditions),
				self = this,
				strs = self.that.options.strConditions || {},
				optionStr;
			if (excludeSelect) {
				options = options.filter(function(cond) {
					return self.getType(cond) != "select"
				})
			}
			optionStr = options.map(function(cond) {
				var selected = _cond == cond ? "selected" : "";
				return '<option value="' + cond + '" ' + selected + ">" + (strs[cond] || cond) + "</option>"
			}).join("");
			return optionStr
		},
		getType: function(condition) {
			return pq.filter.getType(condition, this.column)
		},
		getVal: function(indx) {
			var column = this.column,
				cond = this["cond" + indx],
				$inp0 = this["$inp" + (indx ? "2" : "0")],
				inp0 = $inp0[0],
				$inp1 = this["$inp" + (indx ? "3" : "1")],
				val0, val1;
			if ($inp0.is("[type='checkbox']")) {
				var indeterminate = inp0.indeterminate;
				val0 = inp0.checked ? true : indeterminate ? null : false
			} else {
				if ($inp0.is(":visible")) val0 = pq.deFormat(column, $inp0.val(), cond);
				if ($inp1.is(":visible")) val1 = pq.deFormat(column, $inp1.val(), cond)
			}
			return [val0, val1]
		},
		init: function(ui) {
			var column = this.column = ui.column;
			column.filter = column.filter || {};
			this.that = ui.grid;
			this.menuH = ui.menuH;
			this.$popup = ui.$popup;
			this.filterRow = ui.filterRow
		},
		initControls: function() {
			var filterUI = this.filterUI[0],
				that = this.that,
				ui = {
					column: this.column,
					headMenu: true
				};
			ui.$editor = $([this.$inp0[0], this.$inp1[0]]);
			ui.condition = this.cond0;
			ui.type = filterUI.type;
			ui.filterUI = filterUI;
			filterUI.init.find(function(i) {
				return i.call(that, ui)
			});
			filterUI = this.filterUI[1];
			ui.$editor = $([this.$inp2[0], this.$inp3[0]]);
			ui.condition = this.cond1;
			ui.type = filterUI.type;
			ui.filterUI = filterUI;
			filterUI.init.find(function(i) {
				return i.call(that, ui)
			})
		},
		isInputHidden: function(type) {
			if (type == "select" || !type) {
				return true
			}
		},
		ok: function() {
			var cond = this.cond0;
			if (this.getType(cond) == "select" && !this.filterRow) {
				this.iRange.change(true)
			} else if (cond) {
				this.filterByCond(true)
			}
			this.close();
			this.refreshRowFilter()
		},
		onModeChange: function() {
			this.filterByCond(!this.btnOk)
		},
		onInput: function(evt) {
			var $inp = $(evt.target),
				filter = !this.btnOk;
			if ($inp.is(":checkbox")) {
				$inp.pqval({
					incr: true
				})
			}
			this.filterByCond(filter);
			if (filter) this.refreshRowFilter()
		},
		onSel1Change: function() {
			var filter = !this.btnOk;
			this.cond0 = this.getSel(0).val();
			this.readFilterUI();
			if (!this.filterRow) {
				this.$inp0.replaceWith(this.getHtmlInput(0));
				this.$inp1.replaceWith(this.getHtmlInput(1));
				this.refreshInputVarsAndEvents();
				this.initControls()
			}
			this.filterByCond(filter);
			this.refreshRowFilter()
		},
		onSel2Change: function() {
			this.cond1 = this.getSel(1).val();
			this.readFilterUI();
			this.$inp2.replaceWith(this.getHtmlInput(2));
			this.$inp3.replaceWith(this.getHtmlInput(3));
			this.refreshInputVarsAndEvents();
			this.initControls();
			this.filterByCond(!this.btnOk)
		},
		ready: function(node) {
			this.node = node = node || this.node;
			var $node = $(node),
				self = this,
				that = self.that,
				column = self.column,
				filter = column.filter,
				rules = filter.crules || [],
				rule0 = rules[0] || filter,
				rule1 = rules[1] || {},
				cond0 = self.cond0 = rule0.condition,
				cond1 = self.cond1 = rule1.condition,
				type0, type1, $sel, filterUI = self.readFilterUI();
			self.iRange = new pq.cFilterMenu.select(that, column);
			type0 = self.getType(cond0);
			type1 = self.getType(cond1);
			$sel = self.$select = $node.find("select");
			self.$sel0 = $($sel[0]).val(cond0);
			self.$sel1 = $($sel[1]).val(cond1);
			self.$filter_mode = $node.find('[name="pq_filter_mode"]');
			self.$clear = $node.find("[data-rel='clear']");
			self.$ok = $node.find("[data-rel='ok']");
			self.btnOk = self.$ok.length;
			if (!self.filterRow) {
				self.refreshInputVarsAndEvents();
				self.$gridR = $node.find("[data-rel='grid']");
				self.$filter_mode.filter("[value=" + filter.mode + "]").attr("checked", "checked");
				self.$filter_mode_div = $node.find(".filter_mode_div");
				self.showHide(cond0, cond1);
				if (type0 == "select") {
					self.iRange.create(self.$gridR, filterUI[0], self.btnOk)
				} else {
					self.readyInput(0, type0, rule0)
				}
				self.readyInput(1, type1, rule1);
				self.initControls()
			}
		},
		readyInput: function(indx, type, rule) {
			var column = this.column,
				cond = this["cond" + indx],
				$inp0 = this["$inp" + (indx ? "2" : "0")],
				$inp1 = this["$inp" + (indx ? "3" : "1")];
			if ($inp0.is(":checkbox")) {
				$inp0.pqval({
					val: rule.value
				})
			}
			$inp0.val(pq.formatEx(column, rule.value, cond));
			if (type == "textbox2") {
				$inp1.val(pq.formatEx(column, rule.value2, cond))
			}
		},
		readFilterUI: function() {
			var fu = this.filterUI = [],
				grid = this.that,
				ui = {
					column: this.column,
					condition: this.cond0,
					indx: 0,
					headMenu: true
				};
			fu[0] = pq.filter.getFilterUI(ui, grid);
			ui.condition = this.cond1;
			ui.indx = 1;
			fu[1] = pq.filter.getFilterUI(ui, grid);
			return fu
		},
		refreshInputVarsAndEvents: function() {
			var self = this,
				column = self.column,
				$inp = self.$inp = $(this.node).find("input[name='" + column.dataIndx + "']:not(.pq-search-txt)"),
				inp0 = $inp[0],
				inp1 = $inp[1],
				inp2 = $inp[2],
				inp3 = $inp[3];
			self.$inp0 = $(inp0);
			self.$inp1 = $(inp1);
			self.$inp2 = $(inp2);
			self.$inp3 = $(inp3);
			self.addEventsInput()
		},
		refreshRowFilter: function() {
			this.that.refreshHeaderFilter({
				dataIndx: this.column.dataIndx
			})
		},
		SelectGrid: function() {
			return this.$gridR.pqGrid("instance")
		},
		showHide: function(condition, condition2) {
			if (this.filterRow) {
				return
			}
			var self = this,
				$mode = self.$filter_mode_div,
				$sel1 = self.$sel1,
				type = self.getType(condition),
				type2, $inp = self.$inp;
			if (type === "select") {
				self.$gridR.show();
				if (self.$gridR.hasClass("pq-grid")) {
					self.$gridR.pqGrid("destroy")
				}
				$inp.hide();
				$mode.hide();
				$sel1.hide()
			} else {
				self.$gridR.hide();
				if (condition) {
					self.$inp0[self.isInputHidden(type) ? "hide" : "show"]();
					self.$inp1[type === "textbox2" ? "show" : "hide"]();
					$mode.show();
					$sel1.show();
					if (condition2) {
						type2 = self.getType(condition2);
						self.$inp2[self.isInputHidden(type2) ? "hide" : "show"]();
						self.$inp3[type2 === "textbox2" ? "show" : "hide"]()
					} else {
						self.$inp2.hide();
						self.$inp3.hide()
					}
				} else {
					$inp.hide();
					$mode.hide();
					$sel1.hide()
				}
			}
		},
		updateConditions: function() {
			var filter = this.column.filter;
			filter.crules = filter.crules || [{}];
			filter.crules[0].condition = this.cond0;
			if (this.cond1) {
				filter.crules[1] = filter.crules[1] || {};
				filter.crules[1].condition = this.cond1
			}
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		new _pq.cEditor(grid)
	});
	_pq.cEditor = function cEditor(that) {
		var self = this;
		self.that = that;
		that.on("editorBeginDone", function(evt, ui) {
			ui.$td[0].edited = true;
			self.fixWidth(ui);
			var edInit = (ui.column.editor || that.options.editor || {}).init;
			if (edInit) that.callFn(edInit, ui)
		}).on("editorEnd", function(evt, ui) {
			ui.$td[0].edited = false
		})
	};
	_pq.cEditor.prototype = {
		fixWidth: function(ui) {
			var self = this,
				that = self.that,
				$td = ui.$td,
				td = $td[0],
				widthTD = td.offsetWidth,
				heightTD = td.offsetHeight,
				RB = that.iRenderB,
				htContTop = RB.htContTop,
				wdContLeft = RB.wdContLeft,
				region = RB.getCellIndx(td)[2],
				topOffset = 0,
				leftOffset = 0;
			if (region == "right") {
				topOffset = htContTop;
				leftOffset = wdContLeft
			}
			if (region == "left") topOffset = htContTop;
			if (region == "tr") leftOffset = wdContLeft;
			var $editor = ui.$editor,
				editorType = $editor[0].type,
				isTextArea = editorType == "textarea",
				$eo = $editor.closest(".pq-editor-outer"),
				posTD = $td.offset(),
				o = that.options,
				rtl = o.rtl,
				left = rtl ? "right" : "left",
				leftTD = posTD.left,
				topTD = posTD.top,
				rightTD = leftTD + widthTD,
				column = ui.column,
				EM = $.extend({}, o.editModel, column.editModel),
				$cont = $eo.parent(),
				posG = $cont.offset(),
				leftG = posG.left,
				topG = posG.top,
				grid = $cont[0],
				gridWidth = grid.offsetWidth,
				rightG = leftG + gridWidth,
				leftE = (rtl ? rightG - rightTD : leftTD - leftG) - 1,
				topE = topTD - topG - 1,
				leftE = leftE > leftOffset ? leftE : leftOffset,
				topE = topE > topOffset ? topE : topOffset,
				objO = {
					top: topE
				},
				minWidth = widthTD + 1,
				minHeight = heightTD + 1,
				maxHeight = grid.offsetHeight - topE,
				maxWidth = gridWidth - leftE,
				minWidth = minWidth > maxWidth ? maxWidth : minWidth,
				minHeight = minHeight > maxHeight ? maxHeight : minHeight,
				objE = {
					minWidth: minWidth,
					maxWidth: maxWidth,
					maxHeight: maxHeight
				};
			objO[left] = leftE;
			$eo.css(objO);
			if (isTextArea) {
				if ($editor.attr("rows") || $editor.attr("columns")) {
					return
				}
				objE.minHeight = minHeight;
				var $child = $td.children("div"),
					bg = $td.css("background-color");
				objE.fontSize = $td.css("font-size");
				objE.fontFamily = $td.css("font-family");
				objE.backgroundColor = bg;
				objE.color = $td.css("color");
				objE.padding = parseInt($child.css("padding-top")) + 2 + "px" + " " + (parseInt($child.css("padding-right")) + 2) + "px"
			} else {
				objE.width = widthTD + 1
			}
			$editor.css(objE);
			isTextArea && $editor.pqtext(EM.saveKey != $.ui.keyCode.ENTER)
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		oldpqGrid = pq.grid,
		cProxy = _pq.cProxy = function(that) {
			this.that = that;
			that.options.reactive && this.init()
		};
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iProxy = new cProxy(grid)
	});
	pq.isEqual = function(val1, val2) {
		if (pq.isObject(val1)) {
			for (var key in val1) {
				if (!pq.isEqual(val1[key], val2[key])) return false
			}
			return true
		} else {
			return val1 === val2
		}
	};
	pq.grid = function(selector, options) {
		var grid = oldpqGrid.apply(pq, arguments),
			iProxy = grid.iProxy,
			goptions = grid.options;
		if (goptions.reactive) {
			grid.on("filter", function() {
				if (options.dataModel) {
					options.dataModel.data = goptions.dataModel.data
				}
				iProxy.prxData()
			});
			iProxy.prxObj(options, iProxy.onOption, true)
		}
		return grid
	};
	cProxy.prototype = {
		init: function() {
			var self = this,
				that = self.that;
			self.prxData();
			self.prxCM();
			that.on("refresh", self.clear.bind(self)).on("dataReady", self.clearV.bind(self)).on("dataAvailable", self.clearDV.bind(self))
		},
		onOption: function(key, val) {
			var self = this,
				key2, grid = self.that,
				obj = {},
				dataModel = "dataModel",
				goptions = grid.options;
			obj[key] = val;
			if (grid.element && !pq.isEqual(obj, goptions)) {
				self.refresh();
				if (pq.isObject(goptions[key])) {
					if (key == "groupModel") {
						grid.Group().option(val, false);
						self.refreshView()
					} else if (key == "treeModel") {
						grid.Tree().option(val)
					} else if (key == "sortModel") {
						grid.sort(val)
					} else {
						if (key == dataModel) {
							if (val.data) {
								self.prxData(val.data)
							}
							self.refreshDataView()
						} else if (key == "pageModel") {
							if (val.rPP || val.type != null) self.refreshDataView()
						}
						for (key2 in val) {
							grid.option(key + "." + key2, val[key2])
						}
					}
				} else {
					if (key == "colModel") {
						self.prxCM(val)
					} else if (key == "mergeCells") {
						self.refreshView()
					}
					grid.option(key, val)
				}
			}
		},
		onCMChange: function() {
			var self = this,
				that = self.that;
			clearTimeout(self.CMtimer);
			self.CMtimer = setTimeout(function() {
				that.refreshCM();
				self.refresh()
			});
			that.one("CMInit", function() {
				clearTimeout(self.CMtimer)
			})
		},
		prxCM: function(_CM) {
			var self = this,
				that = self.that,
				CM = _CM || that.options.colModel;
			if (CM) {
				self.prxArray(CM, self.onCMChange.bind(self));
				CM.forEach(function(col) {
					if (col.colModel) {
						self.prxCM(col.colModel)
					}
				})
			}
		},
		prxData: function(_data) {
			var self = this,
				that = self.that,
				data = _data || that.options.dataModel.data;
			if (data) {
				self.prxArray(data, function() {
					clearTimeout(self.datatimer);
					self.datatimer = setTimeout(function() {
						self.refreshView()
					});
					that.one("dataReady", function() {
						clearTimeout(self.datatimer)
					})
				})
			}
		},
		prxArray: function(data, cb) {
			var self = this,
				proto = Array.prototype,
				keys = "pop push reverse shift sort splice unshift".split(" ");
			keys.forEach(function(key) {
				data[key] = function() {
					var args = arguments,
						isSplice = key == "splice",
						ret = Object.getPrototypeOf(data)[key].apply(this, args);
					if (key == "push" || isSplice || key == "unshift") {
						self.prxArrayObjs(isSplice ? proto.slice.call(args, 2) : args)
					}
					cb.call(self);
					return ret
				}
			});
			self.prxArrayObjs(data)
		},
		prxArrayObjs: function(data) {
			var self = this,
				i = 0,
				len = data.length;
			for (; i < len; i++) {
				self.prxObj(data[i])
			}
		},
		prxObj: function(rd, cb, deep, model) {
			if (!pq.isObject(rd) || model == "tabModel") {
				return
			}
			var obj, key, self = this,
				pq_proxy = "pq_proxy";
			if (!rd[pq_proxy]) {
				Object.defineProperty(rd, pq_proxy, {
					value: {},
					enumerable: false
				})
			}
			obj = rd[pq_proxy];
			obj.__self = self;
			for (key in rd) {
				if (key.substr(0, 3) != "pq_") {
					if (deep && !model && pq.isObject(rd[key])) {
						self.prxObj(rd[key], cb, deep, key)
					}
					if (!obj.hasOwnProperty(key)) {
						Object.defineProperty(obj, key, Object.getOwnPropertyDescriptor(rd, key));
						self.defineProp(rd, obj, key, cb, deep, model)
					}
				}
			}
		},
		defineProp: function(rd, obj, key, cb, deep, model) {
			Object.defineProperty(rd, key, {
				get: function() {
					return obj[key]
				},
				set: function(val) {
					var self = obj.__self,
						tmpObj;
					if (deep && !model && pq.isObject(val)) {
						self.prxObj(val, cb, deep, key)
					}
					obj[key] = val;
					if (cb) {
						tmpObj = val;
						if (model) {
							tmpObj = {};
							tmpObj[key] = val
						}
						cb.call(self, model || key, tmpObj)
					} else {
						self.refresh()
					}
				},
				enumerable: true
			})
		},
		clear: function() {
			clearTimeout(this.timer)
		},
		clearV: function() {
			this.clear();
			clearTimeout(this.timerV)
		},
		clearDV: function() {
			this.clearV();
			clearTimeout(this.timerDV)
		},
		X: function(x, tid) {
			var self = this;
			self[tid] = setTimeout(function() {
				self.that.element && self.that[x]()
			})
		},
		refresh: function() {
			this.clear();
			this.X("refresh", "timer")
		},
		refreshView: function() {
			this.clearV();
			this.X("refreshView", "timerV")
		},
		refreshDataView: function() {
			this.clearDV();
			this.X("refreshDataAndView", "timerDV")
		}
	}
})(jQuery);
(function($) {
	$.widget("pq.drag", $.ui.mouse, {
		_create: function() {
			this._mouseInit()
		},
		_mouseCapture: function(evt) {
			this._trigger("capture", evt);
			return true
		},
		_mouseStart: function(evt) {
			this._trigger("start", evt);
			return true
		},
		_mouseDrag: function(evt) {
			this._trigger("drag", evt)
		},
		_mouseStop: function(evt) {
			this._trigger("stop", evt)
		}
	})
})(jQuery);
(function($) {
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iPic = new cPic(grid);
		grid.Pic = function() {
			return grid.iPic
		}
	});
	var _pq = $.paramquery,
		cPic = _pq.cPic = function(that) {
			var self = this,
				o = that.options,
				rtl = self.rtl = o.rtl;
			self.id = 0;
			self.left = rtl ? "right" : "left";
			self.pics = [];
			self.that = that;
			that.on("dataAvailable", function(evt, ui) {
				if (ui.source != "filter") {
					self.reset();
					that.one("refresh", function() {
						self.addPics(o.pics)
					})
				}
			}).on("assignTblDims", self.refresh.bind(self))
		};
	cPic.prototype = {
		addPics: function(pics) {
			var self = this;
			(pics || []).forEach(function(pic) {
				self.add(pic.name, pic.src, pic.from, pic.to, pic.cx, pic.cy, true)
			})
		},
		create: function($cont, src, left, top, width, height, pic, grp, id) {
			var self = this,
				obj, img = new Image,
				cssobj = {
					position: "absolute",
					top: top,
					zIndex: 5
				},
				$img = $(img),
				$div;
			img.src = src;
			cssobj[self.left] = left;
			$cont.append(img);
			$div = $img.attr({
				draggable: false,
				"pic-id": id,
				tabindex: 1
			}).css({
				height: height,
				width: width,
				cursor: "move"
			}).on("focus", function() {
				$(grp).css({
					outline: "2px dotted #999"
				})
			}).on("keydown", function(evt) {
				if (evt.keyCode == $.ui.keyCode.DELETE) self.remove(self.getId(this))
			}).on("blur", function() {
				$(grp).css({
					outline: ""
				})
			}).resizable({
				resize: self.onResize(self, grp, pic)
			}).parent(".ui-wrapper").css(cssobj);
			$div.find(".ui-resizable-se").removeClass("ui-icon");
			obj = self.drag($div, grp, pic);
			$img.drag({
				distance: 3,
				capture: function() {
					$img.focus()
				},
				start: obj.start,
				drag: obj.drag,
				stop: obj.stop
			});
			grp.push($div[0])
		},
		drag: function($div, grp, pic) {
			var self = this,
				that = self.that,
				iR = that.iRenderB,
				cx = pic.cx,
				cy = pic.cy,
				leftArr = iR.leftArr,
				topArr = iR.topArr,
				leftMost = leftArr[leftArr.length - 1],
				topMost = topArr[topArr.length - 1],
				numColWd = iR.numColWd,
				p = function(str) {
					return parseInt($div.css(str))
				},
				drag;
			return {
				start: function(evt) {
					drag = {
						pageX: evt.pageX,
						pageY: evt.pageY,
						scrollX: that.scrollX(),
						scrollY: that.scrollY()
					}
				},
				drag: function(evt) {
					var scrollX = that.scrollX(),
						scrollY = that.scrollY(),
						dx = (evt.pageX + scrollX - drag.pageX - drag.scrollX) * (self.rtl ? -1 : 1),
						dy = evt.pageY + scrollY - drag.pageY - drag.scrollY,
						left = p(self.left),
						top = p("top"),
						cssobj = {};
					drag.pageX = evt.pageX;
					drag.scrollX = scrollX;
					drag.pageY = evt.pageY;
					drag.scrollY = scrollY;
					if (left + dx - numColWd < 0) dx = numColWd - left;
					else if (left + dx + cx > leftMost + numColWd) dx = leftMost + numColWd - left - cx;
					if (top + dy < 0) dy = 0 - top;
					else if (top + dx + cy > topMost) dy = topMost - top - cy;
					cssobj.top = top + dy;
					cssobj[self.left] = left + dx;
					$(grp).css(cssobj)
				},
				stop: function() {
					var left = p(self.left) - numColWd,
						top = p("top"),
						c1 = self.findIndx(leftArr, left),
						r1 = self.findIndx(topArr, top);
					pic.from = [c1, left - leftArr[c1], r1, top - topArr[r1]]
				}
			}
		},
		onResize: function(self, grp, pic) {
			return function(evt, ui) {
				var ht = ui.size.height,
					wd = ui.size.width,
					obj = {
						height: ht,
						width: wd
					};
				$(grp).css(obj);
				$(grp).find("img").css(obj);
				delete pic.to;
				pic.cx = wd;
				pic.cy = ht
			}
		},
		getPos: function(from) {
			var iR = this.that.iRenderB,
				r1 = from[2] * 1,
				c1 = from[0] * 1,
				tmp = iR.getCellXY(r1, c1),
				left = tmp[0] + from[1],
				top = tmp[1] + from[3];
			return [left, top]
		},
		name: function(str) {
			return str.replace(/[^0-9,a-z,A-Z,_\.]/g, "_")
		},
		refresh: function() {
			var self = this,
				$grid = self.that.widget();
			self.pics.forEach(function(pic) {
				var from = pic.from,
					id = pic.id,
					arr = self.getPos(from),
					left = arr[0],
					top = arr[1],
					obj = {
						top: top
					},
					$div = $grid.find("[pic-id=" + id + "]").parent();
				obj[self.left] = left;
				$div.css(obj)
			})
		},
		add: function(name, src, from, to, cx, cy, ignore) {
			var self = this;
			if (!src) return;
			else if (src.substr(0, 5) != "data:") {
				name = name || src.split("/").pop();
				pq.urlToBase(src, function(src2) {
					self.add(name, src2, from, to, cx, cy, ignore)
				})
			} else {
				var that = self.that,
					iR = that.iRenderB,
					arr = self.getPos(from),
					left = arr[0],
					top = arr[1],
					r2, c2, left2, top2, tmp, pic, grp = [],
					id = self.id++,
					img, cb = function(width, height) {
						pic = {
							name: name,
							src: src,
							get from() {
								var from = this._from;
								return [that.getColIndx({
									column: from[0]
								}), from[1], from[2].pq_ri, from[3]]
							},
							set from(arr) {
								this._from = [that.colModel[arr[0]], arr[1], that.getRowData({
									rowIndx: arr[2]
								}), arr[3]]
							},
							cx: width,
							cy: height,
							id: id
						};
						pic.from = from;
						["$cright", "$cleft", "$clt", "$ctr"].forEach(function($c) {
							self.create(iR[$c], src, left, top, width, height, pic, grp, id)
						});
						self.pics.push(pic);
						ignore || that.iHistory.push({
							callback: function(redo) {
								if (redo) id = self.add(name, src, from, to, width, height, true);
								else self.remove(id, true)
							}
						});
						that._trigger("picAdd")
					};
				if (to && to.length) {
					c2 = to[0];
					r2 = to[2];
					tmp = iR.getCellXY(r2, c2);
					left2 = tmp[0] + to[1], top2 = tmp[1] + to[3];
					cb(left2 - left, top2 - top)
				} else if (cy) {
					cb(cx, cy)
				} else {
					img = new Image;
					img.onload = function() {
						cb(img.width, img.height)
					};
					img.src = src
				}
			}
			return id
		},
		findIndx: function(arr, val) {
			return arr.findIndex(function(x) {
				return val < x
			}) - 1
		},
		getId: function(img) {
			return $(img).attr("pic-id")
		},
		remove: function(id, ignore) {
			var self = this,
				that = self.that,
				picR, indx = self.pics.findIndex(function(pic) {
					return pic.id == id
				});
			that.widget().find("[pic-id=" + id + "]").remove();
			picR = self.pics.splice(indx, 1)[0];
			ignore || that.iHistory.push({
				callback: function(redo) {
					if (redo) self.remove(id, true);
					else id = self.add(picR.name, picR.src, picR.from, picR.to, picR.cx, picR.cy, true)
				}
			})
		},
		reset: function() {
			this.that.widget().find("[pic-id]").remove();
			this.pics.length = 0;
			this.id = 0
		}
	}
})(jQuery);
(function($) {
	var chrome = function() {
		var _chrome;
		return function() {
			if (_chrome == null) {
				var $txt = $("<textarea style='padding:0 50px;width:1px;border:none;box-sizing:border-box;visibility:hidden;'>a</textarea>").appendTo(document.body),
					sw = $txt[0].scrollWidth;
				$txt.remove();
				_chrome = sw == 100
			}
			return _chrome
		}
	}();
	$.fn.pqtext = function(allowEnter) {
		var $ele = this,
			ele = $ele[0],
			cls = "pq-text",
			factor = chrome() ? parseInt($ele.css("paddingRight")) + 5 : 1;
		if ($ele.hasClass(cls)) {
			return
		}

		function resize() {
			var style = ele.style,
				minWidth = style.minWidth;
			style.whiteSpace = "pre";
			style.wordWrap = "normal";
			style.height = 0;
			style.width = 0;
			style.minWidth = 0;
			style.width = ele.scrollWidth + factor + "px";
			style.minWidth = minWidth;
			style.whiteSpace = "pre-wrap";
			style.wordWrap = "break-word";
			style.height = ele.scrollHeight + "px"
		}
		resize();
		$ele.addClass(cls).attr("spellcheck", false).on("input", resize).on("keydown", function(evt) {
			var start, end, val, ss = "selectionStart",
				se = "selectionEnd";
			if (evt.keyCode == $.ui.keyCode.ENTER) {
				if (evt.altKey || allowEnter) {
					val = ele.value;
					start = ele[ss];
					end = ele[se];
					ele.value = val.slice(0, start) + "\n" + val.slice(start, val.length);
					ele[ss] = start + 1;
					ele[se] = end + 1;
					$ele.trigger("input")
				}
				evt.preventDefault()
			}
		})
	}
})(jQuery);
(function($) {
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iRowResize = new cRowResize(grid);
		grid.RowResize = function() {
			return grid.iRowResize
		}
	});
	var _pq = $.paramquery,
		cRowResize = _pq.cRowResize = function(that) {
			var self = this;
			self.that = that;
			self.ht = 8;
			if (that.options.rowResize) {
				that.on(true, "cellMouseDown", self.onCellDown.bind(self)).on("cellMouseEnter", self.onCellEnter.bind(self))
			}
		};
	cRowResize.prototype = {
		onCellDown: function(evt, ui) {
			if (ui.colIndx == -1) {
				var self = this,
					y = evt.pageY,
					td = evt.currentTarget,
					$td = $(td),
					top = $td.offset().top,
					ht = td.offsetHeight;
				if (y >= top + ht - self.ht) {
					self.createDrag($td, ui);
					var e = $.Event("mousedown", evt);
					e.type = "mousedown";
					$td.trigger(e);
					return false
				} else if ($td.draggable("instance")) {
					$td.draggable("destroy")
				}
			}
		},
		onCellEnter: function(evt, ui) {
			if (ui.colIndx == -1) {
				var self = this,
					cls = "pq-row-resize",
					$td = $(evt.currentTarget);
				if (!self.drag && !$td.find("." + cls).length) {
					$td.append("<div class='" + cls + "' style='position:absolute;height:" + (self.ht - 1) + "px;bottom:0;left:0;width:100%;cursor:row-resize;'></div>");
				}
			}
		},
		createDrag: function($td, ui) {
			var self = this,
				that = self.that,
				rd = ui.rowData,
				rip = ui.rowIndxPage,
				iR = that.iRenderB,
				$cont = that.$cont,
				startPos, style_common = "width:100%;background-color:#000;height:1px;";
			if (!$td.hasClass("ui-draggable")) {
				$td.on("dblclick", function() {
					delete rd.pq_htfix;
					iR.autoHeight({})
				}).draggable({
					axis: "y",
					cursor: "row-resize",
					cursorAt: {
						top: -2
					},
					start: function(evt) {
						self.drag = true;
						startPos = evt.pageY;
						self.$top = $("<div style='" + style_common + "position:absolute;top:" + (iR.getTop(rip) - iR.scrollY()) + "px;'></div>").appendTo($cont)
					},
					helper: function() {
						return $("<div style='" + style_common + "'></div>").appendTo($cont)
					},
					stop: function(evt) {
						self.drag = false;
						var dy = evt.pageY - startPos,
							arr = iR.rowhtArr;
						self.$top.remove();
						rd.pq_ht = Math.max(arr[rip] + dy, 10);
						rd.pq_htfix = true;
						that.refresh()
					}
				})
			}
		}
	}
})(jQuery);
(function($) {
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iTab = new cTab(grid);
		grid.Tab = function() {
			return grid.iTab
		}
	});
	var _pq = $.paramquery,
		cTab = _pq.cTab = function(that) {
			var self = this,
				activeId, o = that.options,
				model = o.tabModel || {},
				tabs = model.tabs;
			self.that = that;
			if (tabs) {
				if (!tabs.length) tabs.push({
					name: o.title,
					_inst: that
				});
				model.byRef = true;
				self.model = model;
				self._tbs = tabs;
				if (!model._main) {
					activeId = model.activeId;
					if (activeId == null) activeId = tabs.findIndex(function(tab) {
						return !tab.hidden
					});
					Object.defineProperty(model, "activeId", {
						get: function() {
							return this.tabs.indexOf(this._at)
						},
						set: function(val) {
							this._at = this.tabs[val]
						},
						configurable: true
					});
					model.activeId = activeId;
					model._main = model._at._inst = that;
					that.on("destroy", self.onDestroy.bind(self));
					self.getSheetOptions(model._at, true)
				}
				that.on("change", self.onChange.bind(self)).on("render", self.onRender.bind(self)).on("toggle", self.onToggle.bind(self))
			}
		};
	_pq.pqGrid.defaults.tabModel = {
		newTab: function() {
			return {
				sheet: {},
				extraRows: 20,
				extraCols: 10
			}
		}
	};
	cTab.prototype = {
		activeTab: function() {
			return this.model._at
		},
		grid: function(tab) {
			return tab._inst
		},
		activate: function(id) {
			var self = this,
				model = self.model,
				tabs = self._tbs,
				tab = tabs[id],
				instance = tab._inst,
				activeId = model.activeId,
				$oldGrid = model._at._inst.widget();
			if (instance) {
				if (activeId != id) {
					$oldGrid.hide();
					instance.widget().show();
					model._at = tab;
					instance.iTab.refresh();
					instance.refresh()
				}
			} else {
				instance = self.create(id, true)
			}
			self.trigger("tabActivate", null, {
				tab: tab
			});
			return instance
		},
		add: function() {
			var self = this,
				tab = self.model.newTab.call(self.main());
			tab.name = tab.name || self.getTitle();
			self._tbs.push(tab);
			self.refresh()
		},
		clear: function() {
			var tabs = this._tbs,
				model = this.model;
			tabs.forEach(function(tab) {
				var i = tab._inst;
				if (i && i != model._main) i.widget().remove()
			});
			tabs.length = 0
		},
		create: function(id, isActive) {
			var tabs = this._tbs,
				model = this.model,
				tab = tabs[id],
				instance = tab._inst;
			if (instance) return instance;
			var $oldGrid = model._at._inst.widget(),
				options = this.getOptions(tab),
				$newGrid = $("<div/>").insertAfter($oldGrid);
			delete tab.sheet;
			$newGrid[0].style.cssText = $oldGrid[0].style.cssText;
			if (isActive) {
				model.activeId = id;
				$oldGrid.hide()
			} else $newGrid.hide();
			options.render = function() {
				tab._inst = this
			};
			return pq.grid($newGrid, options)
		},
		findActive: function(id) {
			var model = this.model,
				tabs = this._tbs,
				tab, i, found, activeTab = model._at;
			if (tabs.indexOf(activeTab) == -1 || activeTab.hidden) {
				for (i = id; i < tabs.length; i++) {
					tab = tabs[i];
					if (!tab.hidden) {
						found = i;
						break
					}
				}
				if (found == null) {
					for (i = id; i >= 0; i--) {
						tab = tabs[i];
						if (tab && !tab.hidden) {
							found = i;
							break
						}
					}
				}
				this.activate(found)
			} else this.refresh()
		},
		remove: function(id) {
			var self = this,
				model = self.model,
				tabs = self._tbs,
				tab = tabs[id],
				inst = tab._inst,
				activeId = model.activeId;
			if (self.show().length > 1) {
				tabs.splice(id, 1);
				self.findActive(activeId);
				if (inst && inst != model._main) inst.destroy()
			}
		},
		rename: function(id, val) {
			var self = this,
				tab = self._tbs[id],
				oldVal = tab.name;
			if (self.isValid(val)) {
				tab.name = val;
				self.trigger("tabRename", null, {
					tab: tab,
					oldVal: oldVal
				});
				self.refresh()
			}
		},
		edit: function(id) {
			var self = this,
				tab = self._tbs[id];
			$("<input class='pq-border-0' value=\"" + tab.name + '">').appendTo(self.getTab(id)).on("change", function(evt) {
				var val = $.trim(this.value);
				self.rename(id, val)
			}).on("focusout", function() {
				self.refresh()
			}).focus().select()
		},
		getId: function(tab) {
			if ($.isPlainObject(tab)) {
				return this._tbs.indexOf(tab)
			}
			var id = $(tab).attr("tabId");
			return id != null ? id * 1 : null
		},
		getSheetOptions: function(tab, apply) {
			var that = this.that,
				iImport = that.iImport,
				sheet = tab.sheet,
				gridOptions, options = sheet ? iImport.importS(sheet, tab.extraRows, tab.extraCols) : {};
			if (apply && (sheet || (gridOptions = this.getGridOptions(tab)))) {
				$.extend(options, gridOptions);
				iImport.applyOptions(that, options)
			}
			return options
		},
		getGridOptions: function(tab) {
			var go = tab.gridOptions;
			if (typeof go == "function") go = go.call(this.main());
			return go
		},
		getOptions: function(tab) {
			var self = this,
				that = self.that,
				o = that.options,
				collapsible = "collapsible",
				CP = o[collapsible],
				options = $.extend(true, {}, self.model._options);
			$.extend(options, self.getSheetOptions(tab), self.getGridOptions(tab));
			["width", "height", "maxHeight", "maxWidth", "tabModel"].forEach(function(key) {
				options[key] = o[key]
			});
			$.extend(true, options[collapsible] = options[collapsible] || {}, {
				state: CP.state,
				toggle: CP.toggle,
				toggled: CP.toggled
			});
			return options
		},
		getTab: function(id) {
			return this.$tabs.find("[tabId=" + id + "]")[0]
		},
		getTitle: function() {
			var tabs = this._tbs,
				strTabName = this.that.options.strTabName || "{0}",
				titles = tabs.map(function(tab) {
					var m = (tab.name || "").match(new RegExp(strTabName.replace("{0}", "(\\d+)"), "i"));
					return m ? m[1] * 1 : 0
				}).sort(function(a, b) {
					return a - b
				});
			return strTabName.replace("{0}", titles.length ? titles.pop() + 1 : 1)
		},
		hide: function(arr) {
			return this.show(arr, true)
		},
		isValid: function(val) {
			if (val.length && val.length <= 31 && !this._tbs.find(function(tab) {
					return tab.name.toUpperCase() == val.toUpperCase()
				}) && !"/\\*?:[]".split("").find(function(char) {
					return val.indexOf(char) >= 0
				})) {
				return true
			}
		},
		main: function() {
			return this.model ? this.model._main : this.that
		},
		trigger: function(name, evt, ui) {
			this._tbs.forEach(function(tab) {
				var instance;
				if (instance = tab._inst) instance._trigger(name, evt, ui)
			})
		},
		find: function(key, val) {
			return this._tbs.find(function(tab) {
				return tab[key] == val
			})
		},
		onChange: function(evt, ui) {
			ui.tab = this.find("_inst", this.that);
			this.trigger("tabChange", evt, ui)
		},
		onClick: function(evt) {
			var $target = $(evt.target),
				self = this,
				close = $target.hasClass("ui-icon-close"),
				strTabRemove = self.that.options.strTabRemove || "",
				id = self.getId($target.closest(".pq-tab-item")),
				tabName;
			if (id != null) {
				tabName = self._tbs[id].name;
				if (close && confirm(strTabRemove.replace("{0}", tabName)) != true) {
					return
				}
				self[close ? "remove" : "activate"](id)
			}
		},
		onDestroy: function() {
			this.clear()
		},
		onDblClick: function(evt) {
			var self = this,
				$tab = $(evt.target).closest(".pq-tab-item"),
				id = self.getId($tab);
			if (id != null && !self._tbs[id].noRename) {
				self.edit(id)
			}
		},
		onPlus: function() {
			this.add()
		},
		onLeft: function(right) {
			var $tabs = this.$tabs,
				tabs = $tabs[0],
				incr = tabs.clientWidth * .8,
				sl = pq.scrollLeft(tabs),
				sl = right == true ? sl + incr : Math.max(sl - incr, 0);
			$tabs.animate({
				scrollLeft: pq.scrollLeftVal(tabs, sl)
			}, 300)
		},
		onRight: function() {
			this.onLeft(true)
		},
		onRender: function() {
			var self = this,
				that = self.that,
				o = that.options,
				TM = o.tabModel,
				rtl = o.rtl,
				$tabs, iconW = "ui-icon-triangle-1-w",
				iconE = "ui-icon-triangle-1-e",
				model = self.model,
				btn = function(cls, icon, attr) {
					return "<div " + (attr || "") + " class='" + cls + " pq-tab-button pq-valign-center pq-bg-3 pq-border-0'><div class='" + icon + " ui-icon'></div></div>"
				},
				$cont = self.$cont = $("<div class='pq-tabs-cont ui-widget-content'>" + (TM.noAdd ? "" : btn("pq-tab-plus", "ui-icon-plus", "title='" + o.strTabAdd + "'")) + btn("pq-tab-w", rtl ? iconE : iconW) + "<div class='pq-tabs-strip' style='" + (TM.css || "") + "'></div>" + btn("pq-tab-e", rtl ? iconW : iconE) + "</div>").appendTo(TM.atTop ? that.$top : that.$bottom);
			if (!model._options) pq.copyObj(model._options = {}, that.origOptions, ["dataModel", "colModel", "tabModel"]);
			$cont.find(".pq-tab-plus").click(self.onPlus.bind(self));
			self.$leftBtn = $cont.find(".pq-tab-w").click(self.onLeft.bind(self));
			self.$rightBtn = $cont.find(".pq-tab-e").click(self.onRight.bind(self));
			$tabs = self.$tabs = $cont.find(".pq-tabs-strip").click(self.onClick.bind(self));
			if (!model.noSortable) {
				$tabs.sortable({
					axis: "x",
					distance: 3,
					start: function() {
						$(".ui-sortable-placeholder").html("a")
					},
					update: self.onMove.bind(self)
				})
			}
			$tabs.on("dblclick", self.onDblClick.bind(self)).on("scroll", self.onScroll.bind(self));
			self.refresh()
		},
		onMove: function(evt, ui) {
			var self = this,
				tabs = self._tbs,
				item = ui.item,
				id = self.getId(item),
				prevId = self.getId(item.prev()) || -1,
				tab = tabs.splice(id, 1)[0];
			tabs.splice(prevId + (prevId > id ? 0 : 1), 0, tab);
			self.refresh()
		},
		onScroll: function(evt) {
			this.model.scrollLeft = pq.scrollLeft(evt.target);
			this.setBtnEnable()
		},
		onToggle: function(evt, ui) {
			var self = this,
				tabs = self._tbs,
				model = self.model,
				that = self.that,
				CP = that.options.collapsible,
				toggled = ui.state == "max";
			if (!model.toggle) {
				that.one("refresh", function() {
					self.setBtn();
					self.setBtnEnable()
				});
				model.toggle = 1;
				tabs.forEach(function(tab) {
					var i = tab._inst;
					if (i && i.element[0] != that.element[0]) {
						var collapsible = i.options.collapsible;
						i.toggle({
							refresh: false
						});
						if (toggled) {
							collapsible.state = $.extend(true, {}, CP.state)
						}
						i.element.hide()
					}
				});
				model.toggle = 0
			}
		},
		refresh: function() {
			var self = this,
				arr = [],
				tabs = self._tbs,
				visible, that = self.that,
				model = self.model,
				strTabClose = that.options.strTabClose || "",
				activeTab = model._at,
				instance, activeId = model.activeId;
			if (activeTab && (instance = activeTab._inst) && that != instance) {
				return instance.Tab().refresh()
			}
			visible = self.show();
			tabs.forEach(function(tab, i) {
				if (!tab.hidden) {
					tab.name = tab.name || self.getTitle();
					arr.push("<div class='pq-tab-item pq-valign-center pq-border-0 " + (i == activeId ? "pq-bg-3 pq-active" : "") + "' tabId='" + i + "'>" + "<div>" + pq.escapeHtml(tab.name) + "</div>" + (visible.length > 1 && !tab.noClose ? "<div title='" + strTabClose + "' class='ui-icon ui-icon-close'></div>" : "") + "</div>")
				}
			});
			self.$tabs.html(arr.join(""));
			self.setBtn();
			self.restoreSL();
			self.setBtnEnable()
		},
		setBtnEnable: function() {
			var self = this,
				target = self.$tabs[0],
				notAllow = {
					cursor: "default",
					opacity: .5
				},
				allow = {
					cursor: "",
					opacity: ""
				},
				max = target.scrollWidth - target.clientWidth,
				sl = pq.scrollLeft(target);
			self.$leftBtn.css(sl ? allow : notAllow);
			self.$rightBtn.css(sl >= max ? notAllow : allow)
		},
		setBtn: function() {
			var self = this,
				$strip = self.$tabs,
				strip = $strip[0],
				$leftBtn = self.$leftBtn,
				$rightBtn = self.$rightBtn;
			$strip.css("width", "");
			if (strip.scrollWidth - strip.clientWidth) {
				$leftBtn.show();
				$rightBtn.show();
				$strip.css("width", strip.offsetWidth - $leftBtn[0].offsetWidth * 2)
			} else {
				$leftBtn.hide();
				$rightBtn.hide()
			}
		},
		restoreSL: function() {
			var model = this.model,
				activeId = model.activeId,
				$tabs = this.$tabs,
				sl = model.scrollLeft;
			if (sl == null && activeId != null) {
				sl = $tabs.find("[tabid=" + activeId + "]")[0].offsetLeft
			}
			pq.scrollLeft($tabs[0], sl)
		},
		show: function(arr, hide) {
			var tabs = this._tbs,
				arr2 = [];
			if (arr) {
				arr.forEach(function(id) {
					tabs[id].hidden = hide
				});
				this.findActive(this.model.activeId)
			} else {
				tabs.forEach(function(tab) {
					if (!tab.hidden == !hide) {
						arr2.push(tab)
					}
				});
				return arr2
			}
		},
		tabs: function() {
			return this._tbs
		}
	}
})(jQuery);
(function($) {
	var cVirtual = pq.cVirtual = function() {
		this.diffH = 0;
		this.diffV = 0
	};
	cVirtual.setSBDim = function() {
		var $div = $("<div style='max-width:100px;height:100px;position:fixed;left:0;top:0;overflow:auto;visibility:hidden;'>" + "<div style='width:200px;height:100px;'></div></div>").appendTo(document.body),
			div = $div[0];
		this.SBDIM = div.offsetHeight - div.clientHeight;
		$div.remove()
	};
	cVirtual.prototype = {
		assignTblDims: function(left) {
			var tbl, self = this,
				isBody = self.isBody(),
				actual = true,
				ht = self.getTopSafe(this[left ? "cols" : "rows"], left, actual),
				maxHt = self.maxHt;
			if (ht > maxHt) {
				self[left ? "ratioH" : "ratioV"] = ht / maxHt;
				self[left ? "virtualWd" : "virtualHt"] = ht;
				ht = maxHt
			} else {
				ht = ht || (self.isHead() ? 0 : 1);
				self[left ? "ratioH" : "ratioV"] = 1
			}
			var tr = self.$tbl_right[0],
				$tl = self[left ? "$tbl_tr" : "$tbl_left"],
				tl = $tl.length ? $tl[0] : {
					style: {}
				},
				prop = left ? "width" : "height";
			tr.style[prop] = ht + "px";
			tl.style[prop] = ht + "px";
			if (isBody) tbl = "Tbl";
			else if (self.isHead()) tbl = "TblHead";
			else tbl = "TblSum";
			if (!isBody && left) self.$spacer.css(self.rtl, ht);
			self.dims[left ? "wd" + tbl : "ht" + tbl] = ht;
			isBody && self.triggerTblDims(100)
		},
		calInitFinal: function(top, bottom, left) {
			var _init, _final, rows = this[left ? "cols" : "rows"],
				ri = this[left ? "freezeCols" : "freezeRows"],
				arr = this[left ? "leftArr" : "topArr"],
				found, offset = this.getTopSafe(ri, left);
			if (this.that.options[left ? "virtualX" : "virtualY"] == false) return [ri, rows - 1];
			if (ri == rows) return [0, ri - 1];
			if (left) offset -= this.numColWd;
			top += offset;
			bottom += offset;
			if (ri < rows && arr[ri] < top) {
				var k = 30,
					j2 = rows,
					jm;
				while (k--) {
					jm = Math.floor((ri + j2) / 2);
					if (arr[jm] >= top) {
						j2 = jm
					} else if (ri == jm) {
						found = true;
						break
					} else {
						ri = jm
					}
				}
				if (!found) {
					throw "ri not found"
				}
			}
			for (; ri <= rows; ri++) {
				if (arr[ri] > top) {
					_init = ri ? ri - 1 : ri;
					break
				}
			}
			for (; ri <= rows; ri++) {
				if (arr[ri] > bottom) {
					_final = ri - 1;
					break
				}
			}
			if (_init == null && _final == null && rows && top > arr[rows - 1]) {
				return [null, null]
			}
			if (_init == null) _init = 0;
			if (_final == null) _final = rows - 1;
			return [_init, _final]
		},
		calInitFinalSuper: function() {
			var self = this,
				dims = this.dims || {},
				arrTB = self.calcTopBottom(),
				top = arrTB[0],
				bottom = arrTB[1],
				fullRefresh = arrTB[2],
				arrLR = self.calcTopBottom(true),
				left = arrLR[0],
				right = arrLR[1],
				arrV = self.calInitFinal(top, bottom),
				r1 = arrV[0],
				r2 = arrV[1],
				arrH = self.calInitFinal(left, right, true),
				c1 = arrH[0],
				c2 = arrH[1];
			if (this.isBody()) {
				dims.bottom = bottom;
				dims.top = top;
				dims.left = left;
				dims.right = right
			}
			fullRefresh = fullRefresh || arrLR[2];
			return [r1, c1, r2, c2, fullRefresh]
		},
		calcTopBottom: function(left) {
			var self = this,
				isBody = self.isBody(),
				dims = self.dims,
				virtualWin = self.virtualWin,
				$cr = self.$cright,
				cr = $cr[0],
				diff, top, bottom;
			if (left) {
				var _stop = pq.scrollLeft(cr),
					stop = self.sleft,
					htCont = dims.wdCont,
					htContTop = self.wdContLeft,
					ratioV = self.ratioH
			} else {
				virtualWin && (diff = $(window).scrollTop() - $cr.offset().top);
				_stop = virtualWin ? self._calcTop(cr, diff) : cr.scrollTop;
				stop = self.stop;
				htCont = self.htCont;
				htContTop = self.htContTop;
				ratioV = self.ratioV
			}
			_stop = _stop < 0 ? 0 : _stop;
			if (ratioV == 1) {
				bottom = _stop + htCont - htContTop;
				bottom = left || !virtualWin ? bottom : self._calcBot(_stop, bottom, diff);
				if (!(bottom >= 0)) {
					bottom = 0
				}
				return [_stop, bottom]
			} else {
				var maxHt = cVirtual.maxHt,
					factorV, virtualHt = self[left ? "virtualWd" : "virtualHt"],
					htContClient = left ? dims.wdContClient : dims.htContClient,
					strDiff = left ? "diffH" : "diffV",
					diff = self[strDiff],
					_diff, fullRefresh, sbHeight = htCont - htContClient;
				if (_stop + htContClient >= maxHt) {
					bottom = virtualHt - htContTop + sbHeight;
					top = bottom - htCont + htContTop
				} else {
					if (_stop == 0) {
						top = 0
					} else {
						factorV = stop == null || Math.abs(_stop - stop) > htCont ? ratioV : 1;
						top = _stop * factorV + (factorV == 1 && diff ? diff : 0)
					}
					bottom = top + htCont - htContTop
				}
				_diff = top - _stop;
				if (_diff != diff) {
					fullRefresh = true;
					self[strDiff] = _diff;
					isBody && self.triggerTblDims(3e3)
				}
				self[left ? "sleft" : "stop"] = _stop;
				if (!(_stop >= 0)) {
					throw "stop NaN"
				}
				if (!(bottom >= 0) || !(top >= 0)) {
					throw "top bottom NaN"
				}
				return [top, bottom, fullRefresh]
			}
		},
		_calcTop: function(cr, diff) {
			return cr.scrollTop + (diff > 0 ? diff : 0)
		},
		_calcBot: function(top, bottom, diff) {
			var _bot = top + $(window).height() + (diff < 0 ? diff : 0);
			return _bot < bottom ? _bot : bottom
		},
		getHtDetail: function(rd, rowHtDetail) {
			var pq_detail = rd.pq_detail;
			if (pq_detail) {}
			return pq_detail && pq_detail.show ? pq_detail.height || rowHtDetail : 0
		},
		getTop: function(ri, actual) {
			var top = this.topArr[ri],
				diff = actual ? 0 : this.diffV;
			if (diff) {
				top = top - (ri > this.freezeRows ? diff : 0);
				if (top < 0) top = 0
			}
			if (top >= 0) return top;
			else throw "getTop ", top
		},
		getTopSafe: function(ri, left, actual) {
			var data_len = left ? this.cols : this.rows;
			return this[left ? "getLeft" : "getTop"](ri > data_len ? data_len : ri, actual)
		},
		getLeft: function(_ci, actual) {
			var offset = this.numColWd,
				arr = this.leftArr,
				maxCI = arr.length - 1,
				ci = _ci > maxCI ? maxCI : _ci,
				left = ci == -1 ? 0 : arr[ci] + offset,
				diff = actual ? 0 : this.diffH;
			if (diff) {
				left = left - (ci > this.freezeCols ? diff : 0);
				if (left < 0) left = 0
			}
			if (left >= 0) return left;
			else throw "getLeft ", left
		},
		getHeightR: function(ri, rows) {
			rows = rows || 1;
			var arr = this.topArr,
				ht = arr[ri + rows] - arr[ri];
			if (ht >= 0) {
				return ht
			} else {
				throw "getHeight ", ht
			}
		},
		getHeightCell: function(ri, rows) {
			rows = rows || 1;
			var arr = this.topArr,
				rowHtDetail = this.rowHtDetail,
				minus, len, ht;
			minus = rowHtDetail ? this.getHtDetail(this.data[ri + rows - 1], rowHtDetail) : 0;
			ht = arr[ri + rows] - arr[ri] - minus;
			if (ht >= 0) {
				return ht
			} else {
				throw "getHeight: ", ht
			}
		},
		getHeightCellM: function(rip, rows) {
			return this.getTopSafe(rip + rows) - this.getTop(rip)
		},
		getHeightCellDirty: function(rip, rows) {
			this.setTopArr(rip, null, rip + rows);
			return this.getHeightCellM(rip, rows)
		},
		getWidthCell: function(ci) {
			if (ci == -1) {
				return this.numColWd
			}
			var wd = this.colwdArr[ci];
			if (wd >= 0) {
				return wd
			} else {
				throw "getWidthCell: ", wd
			}
		},
		getWidthCellM: function(ci, cols) {
			return this.getTopSafe(ci + cols, true) - this.getLeft(ci)
		},
		initRowHtArr: function() {
			var rowht = this.rowHt,
				data = this.data,
				len = data.length,
				rowHtDetail = this.rowHtDetail,
				rd, rowhtArr = this.rowhtArr = [],
				topArr = this.topArr = [],
				i = 0;
			if (rowHtDetail) {
				for (; i < len; i++) {
					rd = data[i];
					rowhtArr[i] = rd.pq_hidden ? 0 : rd.pq_ht || rowht + this.getHtDetail(rd, rowHtDetail)
				}
			} else {
				for (; i < len; i++) {
					rd = data[i];
					rowhtArr[i] = rd.pq_hidden ? 0 : rd.pq_ht || rowht
				}
			}
		},
		initRowHtArrDetailSuper: function(arr) {
			var rowhtArr = this.rowhtArr,
				rip, data = this.data;
			arr.forEach(function(item) {
				rip = item[0];
				rowhtArr[rip] = data[rip].pq_ht = rowhtArr[rip] + item[1]
			});
			this.setTopArr();
			this.assignTblDims()
		},
		initRowHtArrSuper: function() {
			this.initRowHtArr();
			this.setTopArr();
			this.assignTblDims()
		},
		refreshRowHtArr: function(ri, full) {
			var rd = this.data[ri],
				rowHtDetail = this.rowHtDetail,
				rowht = this.rowHt;
			this.rowhtArr[ri] = rd.pq_hidden ? 0 : rowht + this.getHtDetail(rd, rowHtDetail);
			if (full) {
				this.setTopArr(ri);
				this.assignTblDims()
			}
		},
		setTopArr: function(r1, left, r2) {
			var i = r1 || 0,
				top, self = this,
				len, final, rowhtArr, topArr;
			if (left) {
				len = self.cols;
				rowhtArr = self.colwdArr;
				topArr = self.leftArr
			} else {
				len = self.rows;
				rowhtArr = self.rowhtArr;
				topArr = self.topArr
			}
			final = r2 && r2 < len ? r2 : len - 1;
			top = i ? topArr[i] : 0;
			for (; i <= final; i++) {
				topArr[i] = top;
				top += rowhtArr[i]
			}
			topArr[i] = top;
			topArr.length = len + 1
		},
		triggerTblDims: function(t) {
			var self = this;
			self.setTimer(function() {
				self.that._trigger("assignTblDims")
			}, "assignTblDims", t)
		}
	}
})(jQuery);
(function($) {
	var MAX_HEIGHT = 1533910;
	$(document).one("pq:ready", function() {
		var $div = $("<div style='position:relative;'></div>").appendTo(document.body),
			idiv = $("<div style='position:absolute;left:0;'></div>").appendTo($div)[0],
			num = 1e9,
			cVirtual = pq.cVirtual;
		idiv.style.top = num + "px";
		var top = idiv.offsetTop - 50;
		MAX_HEIGHT = top <= 1e4 ? MAX_HEIGHT : top;
		if (MAX_HEIGHT > 16554378) {
			MAX_HEIGHT = 16554378
		}
		cVirtual.maxHt = MAX_HEIGHT;
		$div.remove();
		cVirtual.setSBDim();
		$(window).on("resize", cVirtual.setSBDim.bind(cVirtual))
	})
})(jQuery);
(function($) {
	pq.cRender = function() {
		this.data = []
	};
	pq.cRender.prototype = $.extend({}, {
		_m: function() {},
		autoHeight: function(ui) {
			var self = this,
				that = self.that,
				isBody = self.isBody(),
				hChanged = ui.hChanged,
				fr = self.freezeRows,
				changed = false,
				initV = self.initV,
				finalV = self.finalV;
			if (self.rows) {
				isBody && that._trigger("beforeAutoRowHeight");
				changed = self.setRowHtArr(initV, finalV, hChanged);
				changed = self.setRowHtArr(0, fr - 1, hChanged) || changed;
				if (changed) {
					self.setTopArr(fr ? 0 : initV);
					self.assignTblDims();
					self.setPanes();
					self.setCellDims(true);
					if (isBody) {
						ui.source = "autoRow";
						self.refresh(ui);
						that._trigger("autoRowHeight")
					}
				} else {
					self.setCellDims(true)
				}
			}
		},
		autoWidth: function(ui) {
			ui = ui || {};
			var self = this,
				fc = self.freezeCols,
				colIndx = ui.colIndx,
				fn = function(ci) {
					if (colIndx.indexOf(ci) >= 0) self.setColWdArr(ci, ci)
				},
				initH = self.initH,
				finalH = self.finalH,
				ci = finalH;
			if (colIndx) {
				for (; ci >= initH; ci--) {
					fn(ci)
				}
				for (ci = fc - 1; ci >= 0; ci--) {
					fn(ci)
				}
			} else {
				self.setColWdArr(initH, finalH);
				self.setColWdArr(0, fc - 1)
			}
		},
		_each: function(cb, init, final, data, hidden, freeze) {
			var self = this,
				jump = self.jump,
				rip = 0,
				rd;
			for (; rip <= final; rip++) {
				rip = jump(init, freeze, rip);
				rd = data[rip];
				if (!rd[hidden]) cb.call(self, rd, rip)
			}
		},
		eachV: function(cb) {
			var self = this;
			self._each(cb, self.initV, self.finalV, self.data, "pq_hidden", self.freezeRows)
		},
		eachH: function(cb) {
			var self = this;
			self._each(cb, self.initH, self.finalH, self.colModel, "hidden", self.freezeCols)
		},
		generateCell: function(rip, ci, rd, column, _region, _ht) {
			var self = this,
				iMerge = self.iMerge,
				_wd, v_rip, v_ci, ui, region, v_region, style = [],
				offset = self.riOffset,
				ri = rip + offset,
				cls = [self.cellCls],
				id, m;
			if (self._m() && (m = iMerge.ismergedCell(ri, ci))) {
				if (m.o_rc) {
					ui = iMerge.getClsStyle(ri, ci);
					ui.style && style.push(ui.style);
					ui.cls && cls.push(ui.cls);
					ri = m.o_ri;
					rip = ri - offset;
					rd = self.data[rip];
					ci = m.o_ci;
					column = self.colModel[ci];
					_ht = self.getHeightCellM(rip, m.o_rc);
					_wd = self.getWidthCellM(ci, m.o_cc);
					cls.push("pq-merge-cell")
				} else if (rip == self._initV || ci == self._initH) {
					region = self.getCellRegion(rip, ci);
					ui = iMerge.getRootCell(ri, ci);
					v_rip = ui.v_ri - offset;
					v_ci = ui.v_ci;
					if (v_rip < 0) {
						return ""
					}
					v_region = self.getCellRegion(v_rip, v_ci);
					self.mcLaid[v_rip + "," + v_ci + (v_region == region ? "" : "," + region)] = true;
					return ""
				} else {
					return ""
				}
			} else if (rd.pq_hidden || column.hidden) {
				return ""
			}
			id = self.getCellId(rip, ci, _region);
			if (self.getById(id)) {
				return ""
			}
			var ht = _ht || self.getHeightCell(rip),
				wd = _wd || self.colwdArr[ci],
				left = self.getLeft(ci);
			style.push(self.rtl + ":" + left + "px;width:" + wd + "px;height:" + ht + "px;");
			return self.renderCell({
				style: style,
				cls: cls,
				attr: ["role='gridcell' id='" + id + "'"],
				rowData: rd,
				rowIndxPage: rip,
				rowIndx: ri,
				colIndx: ci,
				dataIndx: column.dataIndx,
				column: column
			})
		},
		generateRow: function(rip, region) {
			var cls = "pq-grid-row",
				style = "top:" + this.getTop(rip) + "px;height:" + this.getHeightR(rip) + "px;width:100%;",
				row_id = this.getRowId(rip, region),
				attr = "role='row' id='" + row_id + "'",
				arr = this.getRowClsStyleAttr(rip);
			cls += " " + arr[0];
			style += arr[1];
			attr += " " + arr[2];
			return "<div class='" + cls + "' " + attr + " style='" + style + "'>"
		},
		getById: function(id) {
			return document.getElementById(id)
		},
		getCell: function(rip, ci, region) {
			var offset = this.riOffset,
				iM, m, ri = rip + offset;
			if (!region) {
				iM = this.iMerge;
				if (iM.ismergedCell(ri, ci)) {
					m = iM.getRootCell(ri, ci);
					if (this.isHead()) {
						rip = m.o_ri;
						ci = m.o_ci
					}
					region = this.getCellRegion(m.v_ri - offset, m.v_ci)
				}
			}
			return this.getById(this.getCellId(rip, ci, region))
		},
		getCellIndx: function(cell) {
			var arr = cell.id.split("-");
			if (arr[3] == "u" + this.uuid) {
				if (arr[5] == "") {
					return [arr[4] * 1, -1, arr[7]]
				}
				return [arr[4] * 1, arr[5] * 1, arr[6]]
			}
		},
		getCellId: function(rip, ci, region) {
			if (rip >= this.data.length) {
				return ""
			}
			region = region || this.getCellRegion(rip, ci);
			return this.cellPrefix + rip + "-" + ci + "-" + region
		},
		getCellCont: function(ri, ci) {
			return this["$c" + this.getCellRegion(ri, ci)]
		},
		getCellCoords: function(rip, ci) {
			var self = this,
				maxHt = self.maxHt,
				offset = self.riOffset,
				ri = rip + offset,
				rip2 = rip,
				c2 = ci,
				arr;
			if (self.isBody()) {
				arr = self.that.iMerge.inflateRange(ri, ci, ri, ci);
				rip2 = arr[2] - offset, c2 = arr[3]
			}
			var y1 = self.getTop(rip),
				y2 = self.getTop(rip2) + self.getHeightCell(rip2),
				x1 = self.getLeft(ci),
				x2 = self.getLeft(c2 + 1);
			if (y2 > maxHt) {
				y1 -= y2 - maxHt;
				y2 = maxHt
			}
			if (x2 > maxHt) {
				x1 -= x2 - maxHt;
				x2 = maxHt
			}
			return [x1, y1, x2, y2]
		},
		getCellRegion: function(rip, ci) {
			var fc = this.freezeCols,
				fr = this.freezeRows;
			if (rip < fr) {
				return ci < fc ? "lt" : "tr"
			} else {
				return ci < fc ? "left" : "right"
			}
		},
		getCellXY: function(rip, ci) {
			var maxHt = this.maxHt,
				left = Math.min(this.getLeft(ci), maxHt),
				top = Math.min(this.getTop(rip), maxHt);
			return [left, top]
		},
		getContRight: function() {
			return this.$cright
		},
		getMergeCells: function() {
			return this._m() ? this.$tbl.children().children(".pq-merge-cell") : $()
		},
		getRow: function(rip, region) {
			return this.getById(this.getRowId(rip, region))
		},
		getAllCells: function() {
			return this.$ele.children().children().children().children().children(this.isHead() ? ".pq-grid-col" : ".pq-grid-cell")
		},
		get$Col: function(ci, $cells) {
			var sel = ["right", "left", "lt", "rt"].map(function(region) {
				return "[id$=-" + ci + "-" + region + "]"
			}).join(",");
			return ($cells || this.getAllCells()).filter(sel)
		},
		get$Row: function(rip) {
			return this.$ele.find("[id^=" + this.getRowId(rip, "") + "]")
		},
		getRowClsStyleAttr: function(rip) {
			var self = this,
				that = self.that,
				cls = [],
				o = that.options,
				rowInit = o.rowInit,
				rd = self.data[rip],
				pq_rowcls = rd.pq_rowcls,
				rowattr = rd.pq_rowattr,
				rowstyle = rd.pq_rowstyle,
				styleStr = pq.styleStr,
				tmp, retui, attr = "",
				style = [],
				ri = rip + self.riOffset;
			o.stripeRows && self.stripeArr[rip] && cls.push("pq-striped");
			if (rd.pq_rowselect) cls.push(that.iRows.hclass);
			pq_rowcls && cls.push(pq_rowcls);
			if (rowattr) {
				attr += that.processAttr(rowattr, style)
			}
			if (rowstyle) style.push(styleStr(rowstyle));
			if (rowInit) {
				retui = rowInit.call(that, {
					rowData: rd,
					rowIndxPage: rip,
					rowIndx: ri
				});
				if (retui) {
					if (tmp = retui.cls) cls.push(tmp);
					if (tmp = retui.attr) attr += " " + tmp;
					if (tmp = retui.style) style.push(styleStr(tmp))
				}
			}
			return [cls.join(" "), style.join(""), attr]
		},
		getRowId: function(rip, region) {
			if (region == null) {
				throw "getRowId region."
			}
			return this.rowPrefix + rip + "-" + region
		},
		getRowIndx: function(row) {
			var id = row.id.split("-");
			return [id[4] * 1, id[5]]
		},
		getTable: function(ri, ci) {
			return this["$tbl_" + this.getCellRegion(ri, ci)]
		},
		getTblCls: function(o) {
			var cls = this.isBody() ? [] : ["pq-grid-summary-table"];
			if (o.rowBorders) cls.push("pq-td-border-top");
			if (o.columnBorders) cls.push("pq-td-border-right");
			if (!o.wrap) cls.push("pq-no-wrap");
			return cls.join(" ")
		},
		getFlexWidth: function() {
			return this._flexWidth
		},
		preInit: function($ele) {
			var self = this,
				isBody = self.isBody(),
				that = self.that,
				o = that.options,
				ns = that.eventNamespace,
				tblCls = "pq-table " + self.getTblCls(o),
				cls = ["pq-cont-inner ", "pq-cont-right", "pq-cont-left", "pq-cont-lt", "pq-cont-tr"];
			$ele.empty();
			$ele[0].innerHTML = ['<div class="pq-grid-cont">', isBody ? '<div class="pq-grid-norows">' + o.strNoRows + "</div>" : "", '<div class="', cls[0] + cls[1], '"><div class="pq-table-right ' + tblCls + '"></div>', isBody ? "" : '<div class="pq-r-spacer" style="position:absolute;top:0;height:10px;"></div>', "</div>", '<div class="' + cls[0] + cls[2] + '"><div class="pq-table-left ' + tblCls + '"></div></div>', '<div class="' + cls[0] + cls[4] + '"><div class="pq-table-tr ' + tblCls + '"></div></div>', '<div class="' + cls[0] + cls[3] + '"><div class="pq-table-lt ' + tblCls + '"></div></div>', "</div>"].join("");
			self.$cright = $ele.find("." + cls[1]).on("scroll", self.onNativeScroll.bind(self));
			self.virtualWin && $(window).on("scroll" + ns + " resize" + ns, self.onNativeScroll.bind(self));
			if (!isBody) self.$spacer = $ele.find(".pq-r-spacer");
			self.$cleft = $ele.find("." + cls[2]).on("scroll", self.onScrollL.bind(self));
			self.$clt = $ele.find("." + cls[3]).on("scroll", self.onScrollLT);
			self.$ctr = $ele.find("." + cls[4]).on("scroll", self.onScrollT);
			self.$tbl = $ele.find(".pq-table").on("scroll", self.onScrollLT);
			self.$tbl_right = $ele.find(".pq-table-right");
			self.$tbl_left = $ele.find(".pq-table-left");
			self.$tbl_lt = $ele.find(".pq-table-lt");
			self.$tbl_tr = $ele.find(".pq-table-tr");
			if (isBody) {
				self.$cleft.add(self.$ctr).on("mousewheel DOMMouseScroll", self.onMouseWheel(self));
				self.$norows = $ele.find(".pq-grid-norows")
			}
		},
		isBody: function() {},
		isHead: function() {},
		isSum: function() {},
		jump: function(initH, fc, ci) {
			if (ci < initH && ci >= fc) {
				ci = initH
			}
			return ci
		},
		hasMergeCls: function(cell) {
			return cell && cell.className.indexOf("pq-merge-cell") >= 0
		},
		initRefreshTimer: function(hChanged) {
			var self = this,
				fn = self.onRefreshTimer(self, hChanged);
			self.setTimer(fn, "refresh")
		},
		initStripeArr: function() {
			var rows = this.rows,
				i = 0,
				stripeArr = this.stripeArr = [],
				data = this.data,
				striped;
			for (; i < rows; i++) {
				if (data[i].pq_hidden) {
					continue
				}
				striped = stripeArr[i] = !striped
			}
		},
		isRenderedRow: function(ri) {
			return !!this.getRow(ri)
		},
		onScrollLT: function() {
			this.scrollTop = this.scrollLeft = 0
		},
		onScrollT: function() {
			this.scrollTop = 0
		},
		onScrollL: function(evt) {
			var target = evt.target,
				self = this;
			pq.scrollLeft(target, 0);
			self.setTimer(function() {
				self.$cright[0].scrollTop = target.scrollTop
			}, "scrollL", 50)
		},
		refresh: function(ui) {
			ui = ui || {};
			var self = this,
				that = self.that,
				isBody = self.isBody(),
				isHead = self.isHead(),
				timer = ui.timer == null ? true : ui.timer,
				mcLaid = self.mcLaid = {},
				fc = self.freezeCols,
				numColWd = self.numColWd,
				fcPane = fc || numColWd ? true : false,
				fr = self.freezeRows,
				arr = self.calInitFinalSuper(),
				r1 = arr[0],
				c1 = arr[1],
				r2 = arr[2],
				c2 = arr[3],
				fullRefresh = ui.fullRefresh || arr[4],
				initV = self.initV,
				finalV = self.finalV,
				initH = self.initH,
				finalH = self.finalH;
			fullRefresh && isBody && that.blurEditor({
				force: true
			});
			self._initV = r1;
			self._finalV = r2;
			self._initH = c1;
			self._finalH = c2;
			isBody && that._trigger("beforeTableView", null, {
				initV: r1,
				finalV: r2,
				pageData: self.data
			});
			if (!fullRefresh) {
				if (finalV != null && r2 >= initV && r1 <= finalV) {
					if (r1 > initV) {
						self.removeView(initV, r1 - 1, initH, finalH);
						fcPane && self.removeView(initV, r1 - 1, numColWd ? -1 : 0, fc - 1)
					} else if (r1 < initV) {
						self.renderView(r1, initV - 1, c1, c2);
						fcPane && self.renderView(r1, initV - 1, 0, fc - 1)
					}
					if (r2 < finalV) {
						self.removeView(r2 + 1, finalV, initH, finalH);
						fcPane && self.removeView(r2 + 1, finalV, numColWd ? -1 : 0, fc - 1)
					} else if (r2 > finalV) {
						self.renderView(finalV + 1, r2, c1, c2);
						fcPane && self.renderView(finalV + 1, r2, 0, fc - 1)
					}
					initV = r1;
					finalV = r2
				}
				if (finalH != null && c2 > initH && c1 < finalH) {
					if (c1 > initH) {
						self.removeView(initV, finalV, initH, c1 - 1);
						fr && self.removeView(0, fr - 1, initH, c1 - 1)
					} else if (c1 < initH) {
						self.renderView(initV, finalV, c1, initH - 1);
						fr && self.renderView(0, fr - 1, c1, initH - 1)
					}
					if (c2 < finalH) {
						self.removeView(initV, finalV, c2 + 1, finalH);
						fr && self.removeView(0, fr - 1, c2 + 1, finalH)
					} else if (c2 > finalH) {
						self.renderView(initV, finalV, finalH + 1, c2);
						fr && self.renderView(0, fr - 1, finalH + 1, c2)
					}
					initH = c1;
					finalH = c2
				}
			}
			if (fullRefresh || (r2 !== finalV || r1 !== initV || c1 !== initH || c2 !== finalH)) {
				isBody && that._trigger("beforeViewEmpty", null, {
					region: "right"
				});
				self.$tbl_right.empty();
				self.renderView(r1, r2, c1, c2);
				if (fcPane && (r2 !== finalV || r1 !== initV)) {
					self.$tbl_left.empty();
					self.renderView(r1, r2, 0, fc - 1)
				}
				if (fr) {
					if (c1 !== initH || c2 !== finalH) {
						that._trigger("beforeViewEmpty", null, {
							region: "tr"
						});
						self.$tbl_tr.empty();
						self.renderView(0, fr - 1, c1, c2)
					}
					if (fcPane && finalV == null) {
						self.$tbl_lt.empty();
						self.renderView(0, fr - 1, 0, fc - 1)
					}
				}
			} else {
				self.removeMergeCells()
			}
			for (var key in mcLaid) {
				var arr = key.split(","),
					ri = arr[0] * 1,
					ci = arr[1] * 1,
					region = arr[2];
				self.renderView(ri, ri, ci, ci, region)
			}
			var initHChanged = c1 != self.initH || c2 != self.finalH,
				hChanged = initHChanged && self.initH != null;
			if (fullRefresh || r2 != self.finalV || r1 != self.initV || initHChanged) {
				self.initV = r1;
				self.finalV = r2;
				self.initH = c1;
				self.finalH = c2;
				if (isBody) that._trigger("refresh", null, {
					source: ui.source,
					hChanged: hChanged
				});
				else that._trigger(isHead ? "refreshHeader" : "refreshSum", null, {
					hChanged: hChanged
				})
			}
		},
		refreshAllCells: function(ui) {
			var self = this;
			self.initH = self.initV = self.finalH = self.finalV = null;
			ui = ui || {};
			ui.fullRefresh = true;
			self.refresh(ui)
		},
		refreshCell: function(rip, ci, rd, column) {
			var self = this,
				m = self.isBody() && self._m() ? self.iMerge.getRootCellV(rip + self.riOffset, ci) : 0,
				found, rip_o = rip,
				ci_o = ci,
				replace = function(cell, region) {
					if (cell) {
						found = true;
						cell.id = "";
						$(cell).replaceWith(self.generateCell(rip, ci, rd, column, region))
					}
				};
			if (m) {
				rip = m.rowIndxPage;
				ci = m.colIndx;
				rd = m.rowData;
				column = m.column;
				["lt", "tr", "left", "right"].forEach(function(region) {
					replace(self.getCell(rip_o, ci_o, region), region)
				})
			} else {
				replace(self.getCell(rip, ci))
			}
			return found
		},
		removeMergeCells: function() {
			var self = this,
				ui, arr, r1, c1, r2, c2, remove, m = self.iMerge,
				cell, region, offset = self.riOffset,
				fc = self.freezeCols,
				fr = self.freezeRows,
				$cells = self.getMergeCells(),
				initH = self._initH,
				finalH = self._finalH,
				initV = self._initV,
				finalV = self._finalV,
				i = 0,
				len = $cells.length,
				row;
			for (; i < len; i++) {
				cell = $cells[i];
				arr = self.getCellIndx(cell);
				if (arr) {
					r1 = arr[0];
					c1 = arr[1];
					region = arr[2];
					ui = m.getRootCell(r1 + offset, c1);
					r2 = r1 + ui.o_rc - 1;
					c2 = c1 + ui.o_cc - 1;
					remove = false;
					if (r1 > finalV || c1 > finalH) {
						remove = true
					} else if (region == "right") {
						if (r2 < initV || c2 < initH) remove = true
					} else if (region == "left") {
						if (r2 < initV) remove = true
					} else if (region == "tr") {
						if (c2 < initH) remove = true
					}
					row = cell.parentNode;
					remove && $(cell).remove();
					if (!row.children.length) {
						row.parentNode.removeChild(row)
					}
				}
			}
		},
		removeView: function(r1, r2, c1, c2) {
			var row, i, j, id, cell, region = this.getCellRegion(r1, c1);
			for (i = r1; i <= r2; i++) {
				row = this.getRow(i, region);
				if (row) {
					for (j = c1; j <= c2; j++) {
						cell = this.getCell(i, j, region);
						if (cell) {
							if (!this.hasMergeCls(cell)) {
								$(cell).remove()
							}
						}
					}
					if (!row.children.length) {
						row.parentNode.removeChild(row)
					}
				}
			}
		},
		renderNumCell: function(rip, nc, region) {
			var self = this,
				ht = self.getHeightR(rip),
				isHead = self.isHead(),
				id = self.getCellId(rip, -1, region),
				style = "width:" + nc + "px;height:" + ht + "px;";
			return "<div id='" + id + "' style='" + style + "' role='gridcell' class='pq-grid-number-cell " + "'>" + (self.isBody() ? rip + 1 + self.riOffset : isHead && rip == self.data.length - 1 ? self.numberCell.title || "" : "") + "</div>"
		},
		renderRow: function(arr, rd, ri, c1, c2, region) {
			var row = this.getRow(ri, region),
				nc = this.numColWd,
				localArr = [],
				htCell = this.getHeightCell(ri),
				str, CM = this.colModel,
				column, ci, div;
			!row && arr.push(this.generateRow(ri, region));
			if (c1 == 0 && nc && (region == "left" || region == "lt")) {
				div = this.renderNumCell(ri, nc, region);
				localArr.push(div)
			}
			for (ci = c1; ci <= c2; ci++) {
				column = CM[ci];
				if (column && !column.hidden) {
					div = this.generateCell(ri, ci, rd, column, region, htCell);
					localArr.push(div)
				}
			}
			str = localArr.join("");
			row ? $(row).append(str) : arr.push(str, "</div>")
		},
		renderView: function(r1, r2, c1, c2, region) {
			if (c1 == null || c2 == null) {
				return
			}
			region = region || this.getCellRegion(r1, Math.min(c1, c2));
			var arr = [],
				data = this.data,
				$tbl = this["$tbl_" + region],
				ri = r1,
				rd;
			for (; ri <= r2; ri++) {
				rd = data[ri];
				if (rd && !rd.pq_hidden) {
					this.renderRow(arr, rd, ri, c1, c2, region)
				}
			}
			$tbl.append(arr.join(""))
		},
		scrollX: function(x, fn) {
			var c = this.$cright[0];
			if (x >= 0) {
				this.scrollXY(x, c.scrollTop, fn)
			} else return pq.scrollLeft(c)
		},
		setCellDims: function(heightOnly) {
			var self = this,
				rtl = self.rtl,
				iMerge = self.iMerge,
				_mergeCells = self._m(),
				m, CM = self.colModel,
				numColWd = self.numColWd,
				jump = self.jump,
				setRowDims = self.setRowDims(),
				offset = self.riOffset,
				initH = self.initH,
				finalH = self.finalH,
				fc = self.freezeCols,
				style;
			self.eachV(function(rd, rip) {
				var $row = self.get$Row(rip),
					ht = self.getHeightR(rip),
					top = self.getTop(rip),
					cell, htCell = self.getHeightCell(rip);
				setRowDims($row, ht, top);
				for (var ci = numColWd ? -1 : 0; ci <= finalH; ci++) {
					ci = jump(initH, fc, ci);
					if (ci < 0 || !CM[ci].hidden) {
						if (_mergeCells && (m = iMerge.ismergedCell(rip + offset, ci))) {} else {
							cell = self.getCell(rip, ci);
							if (cell) {
								style = cell.style;
								style.height = (ci == -1 ? ht : htCell) + "px";
								if (!heightOnly) {
									style.width = self.getWidthCell(ci) + "px";
									style[rtl] = self.getLeft(ci) + "px"
								}
							}
						}
					}
				}
			});
			var $merge = self.getMergeCells(),
				i = 0,
				len = $merge.length;
			for (; i < len; i++) {
				var cell = $merge[i],
					arr = self.getCellIndx(cell);
				if (arr) {
					var o_rip = arr[0],
						o_ci = arr[1],
						m = iMerge.getRootCell(o_rip + offset, o_ci),
						v_rip = m.v_ri - offset,
						$row = self.get$Row(v_rip),
						ht = self.getHeightR(v_rip),
						htCell = self.getHeightCellM(o_rip, m.o_rc),
						top = self.getTop(v_rip);
					setRowDims($row, ht, top);
					style = cell.style;
					style.height = htCell + "px";
					if (!heightOnly) {
						style.width = self.getWidthCellM(o_ci, m.o_cc) + "px";
						style[rtl] = self.getLeft(o_ci) + "px"
					}
				}
			}
		},
		setRowDims: function() {
			return function($row, ht, top) {
				var obj = {
					height: ht,
					width: "100%"
				};
				obj.top = top;
				$row.css(obj)
			}
		},
		setColWdArr: function(initH, finalH) {
			var ci = finalH,
				rip, self = this,
				offset = self.riOffset,
				jump = self.jump,
				CM = self.colModel,
				column, cell, rd, data = self.data,
				width, fr = self.freezeRows,
				maxWidth = self.maxHt + "px",
				wd, consider, iM = self.iMerge,
				m, initV = self.initV,
				child, child2, isBody = self.isBody(),
				isSum = self.isSum(),
				takeColumnWidths = isBody || isSum,
				finalV = self.isHead() ? self.that.headerCells.length - 1 : self.finalV;
			if (finalV >= 0) {
				for (; ci >= initH; ci--) {
					column = CM[ci];
					if (!column.hidden && (column.width + "").indexOf("%") == -1) {
						wd = takeColumnWidths ? column.width : column._minWidth;
						if (wd) {
							for (rip = 0; rip <= finalV; rip++) {
								rip = jump(initV, fr, rip);
								rd = data[rip];
								if (rd && !rd.pq_hidden) {
									consider = true;
									if (m = iM.ismergedCell(rip + offset, ci)) {
										if (m == true) {
											continue
										}
										m = iM.getRootCell(rip + offset, ci);
										if (m.v_rc > 1 || m.v_cc > 1) {
											if (m.v_cc > 1) continue;
											consider = false
										}
										cell = self.getCell(m.o_ri - offset, m.o_ci)
									} else {
										cell = self.getCell(rip, ci)
									}
									cell.parentNode.style.width = maxWidth;
									if (consider) {
										cell.style.width = "auto";
										child = $(cell).find(".pq-menu-icon,.pq-menu-filter-icon");
										if (child.length) {
											child.css({
												position: "static",
												"float": "left",
												width: 20
											});
											child2 = $(cell).find(".pq-td-div");
											child2.css("width", "auto")
										}
									}
									width = cell.offsetWidth + 1;
									if (consider && child.length) {
										child.css({
											position: "",
											"float": "",
											width: ""
										});
										child2.css("width", "")
									}
									wd = Math.max(width, wd)
								}
							}
							if (!(wd > 0)) {
								throw "wd NaN"
							}
							column.width = self.colwdArr[ci] = wd;
							column._resized = true
						}
					}
				}
			}
		},
		setRowHtArr: function(initV, finalV, hChanged) {
			var rip = finalV,
				ci, _ci, self = this,
				changed, jump = self.jump,
				offset = self.riOffset,
				rowhtArr = self.rowhtArr,
				newht, data = self.data,
				CM = self.colModel,
				rd, cell, height, _m = self._m(),
				diffV = self.diffV,
				fc = self.freezeCols,
				rowHtMin = self.rowHt,
				ht, iM = self.iMerge,
				m, rc, rowHtDetail = self.rowHtDetail,
				htDetail, initH = self.initH,
				finalH = self.finalH;
			for (; rip >= initV; rip--) {
				rd = data[rip];
				if (rd && !rd.pq_hidden && !rd.pq_htfix) {
					htDetail = rowHtDetail ? self.getHtDetail(rd, rowHtDetail) : 0;
					ht = hChanged ? rowhtArr[rip] - htDetail : rowHtMin;
					for (ci = 0; ci <= finalH; ci++) {
						_ci = ci, ci = jump(initH, fc, ci);
						if (!CM[ci].hidden) {
							if (m = _m && iM.ismergedCell(rip + offset, ci)) {
								if (m == true || diffV) {
									continue
								}
								m = iM.getRootCell(rip + offset, ci);
								cell = self.getCell(m.o_ri - offset, m.o_ci)
							} else {
								cell = self.getCell(rip, ci)
							}
							if (cell) {
								cell.style.height = "auto";
								height = cell.offsetHeight;
								if (m) {
									rc = m.o_rc - (m.v_ri - m.o_ri) - 1;
									height -= m.v_rc > 1 ? self.getHeightCellDirty(m.v_ri - offset + 1, rc) : 0
								}
								ht = Math.max(height, ht)
							}
						}
					}
					newht = ht + htDetail;
					if (rowhtArr[rip] != newht) {
						rowhtArr[rip] = rd.pq_ht = newht;
						changed = true
					}
				}
			}
			return changed
		},
		setTimer: function(rAF) {
			var timeID = {};
			return rAF === true ? function(fn) {
				fn()
			} : function(fn, id, interval) {
				clearTimeout(timeID[id]);
				var self = this;
				timeID[id] = setTimeout(function() {
					self.that.element && fn.call(self)
				}, interval || 300)
			}
		}
	}, new pq.cVirtual)
})(jQuery);
(function($) {
	pq.cRenderBody = function(that, obj) {
		var self = this,
			uuid = self.uuid = that.uuid,
			o = that.options,
			$b = self.$ele = obj.$b,
			$sum = self.$sum = obj.$sum,
			$h = self.$h = obj.$h,
			DMht, prInterval = o.postRenderInterval;
		self.that = that;
		self.rtl = o.rtl ? "right" : "left";
		self.virtualWin = o.virtualWin;
		self.setTimer = self.setTimer(uuid);
		self.cellPrefix = "pq-body-cell-u" + uuid + "-";
		self.rowPrefix = "pq-body-row-u" + uuid + "-";
		self.cellCls = "pq-grid-cell";
		self.iMerge = that.iMerge;
		self.rowHt = o.rowHt || 27;
		self.rowHtDetail = (DMht = o.detailModel.height) == "auto" ? 1 : DMht;
		self.iRenderHead = that.iRenderHead = new pq.cRenderHead(that, $h);
		self.iRenderSum = that.iRenderSum = new pq.cRenderSum(that, $sum);
		that.on("headHtChanged", self.onHeadHtChanged(self));
		if (prInterval != null) {
			that.on("refresh refreshRow refreshCell refreshColumn", function() {
				if (prInterval < 0) self.postRenderAll();
				else self.setTimer(self.postRenderAll, "postRender", prInterval)
			})
		}
		self.preInit($b);
		that.on("refresh softRefresh", self.onRefresh.bind(self))
	};
	pq.cRenderBody.prototype = $.extend({}, new $.paramquery.cGenerateView, new pq.cRender, {
		setHtCont: function(ht) {
			this.dims.htCont = ht;
			this.$ele.css("height", ht)
		},
		flex: function(ui) {
			var self = this,
				that = self.that;
			if (that._trigger("beforeFlex", null, ui) !== false) {
				self.iRenderHead.autoWidth(ui);
				self.iRenderSum.autoWidth(ui);
				self.autoWidth(ui);
				that.refreshCM(null, {
					flex: true
				});
				that.refresh({
					source: "flex",
					soft: true
				})
			}
		},
		init: function(obj) {
			obj = obj || {};
			var self = this,
				that = self.that,
				soft = obj.soft,
				normal = !soft,
				source = obj.source,
				iRH = self.iRenderHead,
				iRS = self.iRenderSum,
				o = that.options,
				SM = o.scrollModel,
				fc = self.freezeCols = o.freezeCols || 0,
				fr = self.freezeRows = o.freezeRows,
				numberCell = self.numberCell = o.numberCell,
				CM = self.colModel = that.colModel,
				width = self.width = o.width,
				height = self.height = o.height,
				visibleRowIndx, data;
			if (normal) {
				self.dims = that.dims;
				self.autoFit = SM.autoFit;
				self.pauseTO = SM.timeout;
				data = that.pdata || [];
				visibleRowIndx = data.findIndex(function(rd) {
					return !rd.pq_hidden
				});
				self.$norows.css("display", visibleRowIndx >= 0 ? "none" : "");
				self.data = data;
				self.maxHt = pq.cVirtual.maxHt;
				self.riOffset = that.riOffset;
				self.cols = CM.length;
				self.rows = data.length;
				if (that._mergeCells) self._m = function() {
					return true
				};
				self.autoRow = o.autoRow;
				self.initRowHtArrSuper();
				if (o.stripeRows) self.initStripeArr()
			}
			self.refreshColumnWidths();
			self.numColWd = iRH.numColWd = iRS.numColWd = numberCell.show ? numberCell.width : 0;
			self.initColWdArrSuper();
			iRS.init(obj);
			if (obj.header) iRH.init(obj);
			else {
				self.setPanes();
				iRH.setCellDims();
				iRH.assignTblDims(true)
			}
			iRS.initPost(obj);
			obj.header && iRH.initPost(obj);
			if (self.$cright[0].scrollTop > self.getTop(self.rows)) {
				return
			}
			if (normal) {
				self.refreshAllCells({
					source: source
				})
			} else if (soft) {
				self.setCellDims();
				self.refresh({
					source: source
				});
				that._trigger("softRefresh")
			}
		},
		initColWdArr: function() {
			var CM = this.colModel,
				len = CM.length,
				column, leftArr = this.leftArr = this.iRenderHead.leftArr = this.iRenderSum.leftArr = [],
				i = 0,
				colwdArr = this.colwdArr = this.iRenderHead.colwdArr = this.iRenderSum.colwdArr = [];
			for (; i < len; i++) {
				column = CM[i];
				colwdArr[i] = column.hidden ? 0 : column._width
			}
		},
		initColWdArrSuper: function() {
			this.initColWdArr();
			this.setTopArr(0, true);
			this.assignTblDims(true)
		},
		inViewport: function(rip, ci, cell) {
			cell = cell || this.getCell(rip, ci);
			var dims = this.dims,
				left = dims.left - 2,
				right = dims.right - (dims.wdCont - dims.wdContClient) + 2,
				top = dims.top - 2,
				bottom = dims.bottom - (dims.htCont - dims.htContClient) + 2,
				region = this.getCellRegion(rip, ci),
				row = cell.parentNode,
				x1 = cell.offsetLeft - dims.wdContLeft,
				y1 = row.offsetTop - dims.htContTop,
				x2 = x1 + cell.offsetWidth,
				y2 = y1 + cell.offsetHeight;
			if (region == "right") {
				return x1 > left && x2 < right && y1 > top && y2 < bottom
			} else if (region == "tr") {
				return x1 > left && x2 < right
			} else if (region == "left") {
				return y1 > top && y2 < bottom
			} else {
				return true
			}
		},
		isBody: function() {
			return true
		},
		onHeadHtChanged: function(self) {
			return function(evt, ht) {
				self.setPanes()
			}
		},
		onMouseWheel: function(self) {
			var timeID;
			return function(evt) {
				var ele = this;
				ele.style["pointer-events"] = "none";
				clearTimeout(timeID);
				timeID = setTimeout(function() {
					ele.style["pointer-events"] = ""
				}, 300)
			}
		},
		onNativeScroll: function() {
			var self = this,
				cr = self.$cright[0],
				that = self.that,
				sl = cr.scrollLeft,
				st = cr.scrollTop;
			self.iRenderSum.setScrollLeft(sl);
			self.iRenderHead.setScrollLeft(sl);
			self.$cleft[0].scrollTop = st;
			self.$ctr[0].scrollLeft = sl;
			self.refresh();
			that._trigger("scroll");
			self.setTimer(function() {
				that._trigger("scrollStop")
			}, "scrollStop", self.pauseTO)
		},
		onRefresh: function(evt, ui) {
			if (ui.source != "autoRow") this.initRefreshTimer(ui.hChanged)
		},
		onRefreshTimer: function(self, hChanged) {
			return function() {
				var cr = self.$cright[0];
				self.autoRow && self.autoHeight({
					hChanged: hChanged
				});
				cr.scrollTop = cr.scrollTop;
				cr.scrollLeft = cr.scrollLeft
			}
		},
		pageDown: function(rip, fn) {
			var self = this,
				arr = self.topArr,
				prevTop = arr[rip],
				top, tmp = rip,
				dims = self.dims,
				stop = this.$cright[0].scrollTop,
				diff = Math.min(dims.htContClient - dims.htContTop, $(window).height()) * 95 / 100,
				reqTop = prevTop + diff,
				i = rip,
				len = arr.length - 1;
			self.scrollY(stop + diff, function() {
				i = rip < self.initV ? self.initV : rip;
				for (; i <= len; i++) {
					top = arr[i];
					if (top > prevTop) {
						prevTop = top;
						tmp = i - 1
					}
					if (top > reqTop) {
						tmp = i - 1;
						break
					}
				}
				fn(tmp)
			})
		},
		pageUp: function(rip, fn) {
			var self = this,
				arr = self.topArr,
				prevTop = arr[rip],
				top, stop = this.$cright[0].scrollTop,
				dims = self.dims,
				diff = Math.min($(window).height(), dims.htContClient - dims.htContTop) * 9 / 10,
				reqTop = prevTop - diff,
				tmp = rip,
				i = rip;
			for (; i >= 0; i--) {
				top = arr[i];
				if (top < prevTop) {
					prevTop = top;
					tmp = i
				}
				if (top < reqTop) {
					tmp = i;
					break
				}
			}
			self.scrollY(stop - diff, function() {
				fn(tmp)
			})
		},
		postRenderAll: function() {
			var self = this,
				grid = self.that,
				offset = self.riOffset,
				cell, ui, iM = self.iMerge,
				data = self.data,
				CM = self.colModel,
				postRender;
			self.eachH(function(column, ci) {
				if (postRender = column.postRender) {
					self.eachV(function(rd, rip) {
						ui = iM.getRootCellO(rip + offset, ci, true);
						cell = self.getCell(ui.rowIndxPage, ui.colIndx);
						if (cell && !cell._postRender) {
							ui.cell = cell;
							grid.callFn(postRender, ui);
							cell._postRender = true
						}
					})
				}
			});
			if (postRender = self.numberCell.postRender) {
				self.eachV(function(rd, rip) {
					var cell = self.getCell(rip, -1),
						ri = rip + offset,
						ui = {
							rowIndxPage: rip,
							colIndx: -1,
							rowIndx: ri,
							rowData: data[ri]
						};
					if (cell && !cell._postRender) {
						ui.cell = cell;
						grid.callFn(postRender, ui);
						cell._postRender = true
					}
				})
			}
		},
		refreshRow: function(ri) {
			var self = this,
				initH = self.initH,
				finalH = self.finalH,
				fc = self.freezeCols,
				$rows = self.get$Row(ri),
				c1, c2, regions = [];
			$rows.each(function(i, row) {
				var arr = self.getRowIndx(row);
				regions.push(arr[1])
			});
			self.that._trigger("beforeViewEmpty", null, {
				rowIndxPage: ri
			});
			$rows.remove();
			regions.forEach(function(region) {
				if (region == "left" || region == "lt") {
					c1 = 0;
					c2 = fc - 1
				} else {
					c1 = initH;
					c2 = finalH
				}
				self.renderView(ri, ri, c1, c2, region)
			})
		},
		newScrollPos: function(rip, left) {
			var self = this,
				dims = self.dims,
				htContClient = dims[left ? "wdContClient" : "htContClient"],
				newScrollTop, scrollTopStr = left ? "scrollLeft" : "scrollTop",
				cr = self.$cright[0],
				data_len = self[left ? "colModel" : "data"].length,
				fr = self[left ? "freezeCols" : "freezeRows"],
				scrollTop = pq[scrollTopStr](cr),
				htContTop = dims[left ? "wdContLeft" : "htContTop"],
				diffTop, diffBot, $win, winScrollTop;
			if (rip < fr || rip > data_len - 1) {
				return scrollTop
			}
			var top = self.getTopSafe(rip, left),
				htCell = self[left ? "getWidthCell" : "getHeightR"](rip);
			if (top != null) {
				if (!left && self.virtualWin) {
					$win = $(window);
					winScrollTop = $win.scrollTop();
					diffTop = top - scrollTop + $(cr).offset().top - winScrollTop;
					diffBot = diffTop - $win.height();
					if (diffBot >= 0) {
						$win.scrollTop(winScrollTop + diffBot + htCell)
					} else if (diffTop < 0) {
						$win.scrollTop(winScrollTop + diffTop)
					}
				}
				if (top + htCell + 1 > scrollTop + htContClient) {
					newScrollTop = top + htCell + 1 - htContClient
				} else if (top < scrollTop + htContTop) {
					newScrollTop = top - htContTop;
					newScrollTop = newScrollTop < 0 ? 0 : newScrollTop
				}
				return newScrollTop >= 0 ? newScrollTop : scrollTop
			}
		},
		scrollColumn: function(ci, fn) {
			var x = this.newScrollPos(ci, true);
			this.scrollX(x, fn)
		},
		scrollRow: function(rip, fn) {
			var y = this.newScrollPos(rip);
			this.scrollY(y, fn)
		},
		scrollCell: function(rip, ci, fn) {
			var y = this.newScrollPos(rip),
				x = this.newScrollPos(ci, true);
			this.scrollXY(x, y, fn)
		},
		scrollY: function(y, fn) {
			var c = this.$cright[0];
			if (y != null) {
				y = y >= 0 ? y : 0;
				this.scrollXY(pq.scrollLeft(c), y, fn)
			} else return c.scrollTop
		},
		scrollXY: function(x, y, fn) {
			var c = this.$cright[0],
				that = this.that,
				oldX = c.scrollLeft,
				oldY = c.scrollTop,
				newX, newY;
			if (x >= 0) {
				pq.scrollLeft(c, x);
				c.scrollTop = y;
				newX = c.scrollLeft;
				newY = c.scrollTop;
				if (fn) {
					if (newX == oldX && newY == oldY) fn();
					else that.one("scroll", function() {
						if (newX == oldX) fn();
						else that.one("scrollHead", fn)
					})
				}
			} else return [oldX, oldY]
		},
		getSBHt: function(wdTbl) {
			var dims = this.dims,
				o = this.that.options,
				sbDim = pq.cVirtual.SBDIM;
			if (this.autoFit) {
				return 0
			} else if (this.width == "flex" && !o.maxWidth) {
				return 0
			} else if (wdTbl > dims.wdCenter + sbDim) {
				return sbDim
			} else {
				return 0
			}
		},
		getSBWd: function() {
			var dims = this.dims,
				o = this.that.options,
				hideVScroll = o.hideVScroll;
			return !dims.htCenter || hideVScroll && dims.htCenter > (dims.htTblHead || 0) + dims.htTbl + dims.htTblSum ? 0 : pq.cVirtual.SBDIM
		},
		setPanes: function() {
			var self = this,
				that = self.that,
				o = that.options,
				autoFit = self.autoFit,
				dims = self.dims,
				htBody = dims.htCenter - dims.htHead - dims.htSum,
				wdBody = dims.wdCenter,
				$ele = self.$ele,
				fc = self.freezeCols,
				fr = self.freezeRows,
				$cr = self.$cright,
				cr = $cr[0],
				$cl = self.$cleft,
				$clt = self.$clt,
				$ctr = self.$ctr,
				wdLeftPane = self.getLeft(fc),
				sbDim = pq.cVirtual.SBDIM,
				flexWd = dims.wdTbl,
				flexHt = Math.max(dims.htTbl, 30) + self.getSBHt(flexWd),
				clientWidth, offsetWidth, clientHeight, htTopPane = self.getTopSafe(fr);
			$ctr.css("display", fr ? "" : "none");
			$cl.css("display", wdLeftPane ? "" : "none");
			$clt.css("display", wdLeftPane && fr ? "" : "none");
			$cr.css("overflow-y", "");
			if (self.height == "flex") {
				if (htBody > 0 && flexHt > htBody) {
					flexHt = Math.min(flexHt, htBody)
				} else {
					$cr.css("overflow-y", "hidden")
				}
				self.setHtCont(flexHt)
			} else {
				self.setHtCont(htBody)
			}
			if (autoFit && self.getSBWd()) {
				$cr.css("overflow-y", "scroll")
			}
			$cr.css("overflow-x", autoFit ? "hidden" : "");
			if (self.width == "flex") {
				flexWd = parseInt($ele[0].style.height) >= dims.htTbl - 1 ? flexWd : flexWd + sbDim;
				if (o.maxWidth && flexWd > wdBody) {
					flexWd = Math.min(flexWd, wdBody)
				} else {
					$cr.css("overflow-x", "hidden")
				}
				self._flexWidth = flexWd;
				$ele.width(self._flexWidth)
			} else {
				$ele.css("width", "")
			}
			self.htCont = dims.htCont = $cr.height();
			self.wdCont = dims.wdCont = $cr.width();
			dims.htContClient = clientHeight = cr.clientHeight;
			dims.wdContClient = clientWidth = cr.clientWidth;
			if (wdLeftPane > clientWidth) {
				$cr.css("overflow-x", "hidden");
				wdLeftPane = clientWidth
			}
			$cl.css("width", wdLeftPane);
			$clt.css("width", wdLeftPane);
			$ctr.width(clientWidth);
			$cl.height(clientHeight);
			offsetWidth = cr.offsetWidth;
			self.iRenderHead.setWidth(offsetWidth, clientWidth);
			self.iRenderSum.setWidth(offsetWidth, clientWidth);
			if (htTopPane > clientHeight) {
				$cr.css("overflow-y", "hidden");
				htTopPane = clientHeight
			}
			$clt.css("height", htTopPane);
			$ctr.css("height", htTopPane);
			self.wdContLeft = dims.wdContLeft = $cl.width();
			self.htContTop = dims.htContTop = $ctr.height()
		}
	}, new pq.cVirtual)
})(jQuery);
(function($) {
	function cMerge(that) {
		this.that = that
	}
	$.paramquery.cMergeHead = cMerge;
	cMerge.prototype = {
		getRootCell: function(ri, ci) {
			var that = this.that,
				hc = that.headerCells,
				column = hc[ri][ci],
				rc = column.rowSpan,
				o_ci = column.leftPos;
			while (ri) {
				if (hc[ri - 1][o_ci] != column) {
					break
				} else {
					ri--
				}
			}
			return {
				v_ri: ri,
				o_ri: ri,
				v_ci: that.getNextVisibleCI(o_ci),
				o_ci: o_ci,
				v_rc: rc,
				o_rc: rc,
				v_cc: column.colSpan,
				o_cc: column.o_colspan
			}
		},
		ismergedCell: function(ri, ci) {
			var that = this.that,
				hc = that.headerCells,
				row = hc[ri],
				column = row ? row[ci] : "",
				o_ci, rc, v_cc, v_ci;
			if (column) {
				o_ci = column.leftPos;
				if ((ri == 0 || hc[ri - 1][ci] !== column) && (v_ci = that.getNextVisibleCI(o_ci)) == ci) {
					rc = column.rowSpan;
					v_cc = column.colSpan;
					if (rc && v_cc && (rc > 1 || v_cc > 1)) {
						return {
							o_ri: ri,
							o_ci: o_ci,
							v_rc: rc,
							o_rc: rc,
							v_cc: v_cc,
							o_cc: column.o_colspan
						}
					}
				} else if (column.colSpan) {
					return true
				}
			}
		},
		getClsStyle: function() {
			return {}
		}
	}
})(jQuery);
(function($) {
	pq.cRenderHS = $.extend({}, new pq.cRender, {
		init: function(obj) {
			obj = obj || {};
			var self = this,
				that = self.that,
				o = that.options,
				CM = self.colModel = that.colModel,
				isHead = self.isHead(),
				isSum = self.isSum(),
				autoRow = isHead ? o.autoRowHead : o.autoRowSum,
				headerCells = that.headerCells,
				data;
			self.freezeCols = o.freezeCols || 0;
			self.numberCell = o.numberCell;
			self.width = o.width;
			self.height = "flex";
			self.freezeRows = 0;
			self.dims = that.dims;
			if (isHead) {
				data = self.data = o.showHeader ? o.filterModel.header ? headerCells.concat([
					[]
				]) : headerCells : []
			} else if (isSum) {
				data = self.data = o.summaryData || []
			}
			self.maxHt = pq.cVirtual.maxHt;
			self.riOffset = 0;
			self.cols = CM.length;
			self.rows = data.length;
			if (isHead) {
				if (headerCells.length > 1) self._m = function() {
					return true
				}
			} else {
				if (o.stripeRows) self.initStripeArr()
			}
			self.autoRow = autoRow == null ? o.autoRow : autoRow;
			self.initRowHtArrSuper();
			self.assignTblDims(true);
			self.setPanes()
		},
		initPost: function(obj) {
			var self = this;
			if (self.data.length && (obj || {}).soft) {
				self.setCellDims();
				self.refresh()
			} else {
				self.refreshAllCells()
			}
		},
		onNativeScroll: function() {
			var self = this;
			self.refresh();
			self.isHead() && self.that._trigger("scrollHead")
		},
		onRefresh: function(evt, ui) {
			this.initRefreshTimer(ui.hChanged)
		},
		refreshHS: function() {
			this.init();
			this.initPost()
		},
		setPanes: function() {
			var self = this,
				that = self.that,
				dims = self.dims,
				$ele = self.$ele,
				fc = self.freezeCols,
				$cr = self.$cright,
				cr = $cr[0],
				$cl = self.$cleft,
				wdLeftPane = self.getLeft(fc),
				isHead = self.isHead(),
				isSum = self.isSum(),
				flexHt = self.getTopSafe(self.rows),
				data_len = self.data.length;
			$cl.css("display", wdLeftPane ? "" : "none");
			$ele.height(flexHt);
			if (isHead) {
				dims.htHead = flexHt;
				that._trigger("headHtChanged")
			} else if (isSum) {
				dims.htSum = flexHt;
				that._trigger("headHtChanged")
			}
			self.htCont = $cr.height();
			self.wdCont = $cr.width();
			$cl.css("width", wdLeftPane);
			$cl.height(cr.clientHeight);
			self.wdContLeft = $cl.width();
			self.htContTop = 0
		},
		setScrollLeft: function(sl) {
			var $cr = this.$cright;
			if ($cr && this.scrollLeft !== sl) this.scrollLeft = $cr[0].scrollLeft = sl
		},
		setWidth: function(offsetWidth, clientWidth) {
			this.$ele[0].style.width = offsetWidth + "px";
			this.$spacer.width(offsetWidth - clientWidth)
		}
	})
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		cRenderHead = pq.cRenderHead = function(that, $h) {
			var o = that.options,
				self = this,
				uuid = self.uuid = that.uuid;
			self.that = that;
			self.iMerge = new _pq.cMergeHead(that);
			self.$ele = $h;
			self.height = "flex";
			self.scrollTop = 0;
			self.rtl = o.rtl ? "right" : "left";
			self.rowHt = o.rowHtHead || 28;
			self.cellCls = "pq-grid-col";
			self.setTimer = self.setTimer(true);
			self.cellPrefix = "pq-head-cell-u" + uuid + "-";
			self.rowPrefix = "pq-head-row-u" + uuid + "-";
			self.preInit($h);
			$h.on("click", self.onHeaderClick.bind(self));
			that.on("headerKeyDown", self.onHeaderKeyDown.bind(self)).on("refreshHeader softRefresh", self.onRefresh.bind(self))
		};
	cRenderHead.prototype = $.extend({}, pq.cRenderHS, new _pq.cHeader, new _pq.cHeaderSearch, {
		getRowClsStyleAttr: function(ri) {
			var len = this.that.headerCells.length,
				cls = "";
			if (len == ri) cls = "pq-grid-header-search-row";
			else if (ri == len - 1) cls = "pq-grid-title-row";
			return [cls, "", ""]
		},
		getTblCls: function(o) {
			var cls = "pq-grid-header-table";
			return o.hwrap ? cls : cls + " pq-no-wrap"
		},
		isHead: function() {
			return true
		},
		onRefreshTimer: function(self, initHChanged) {
			return function() {
				var cr = self.$cright[0];
				self.autoRow && self.autoHeight({
					timer: false,
					hChanged: initHChanged
				});
				cr.scrollTop = 0;
				cr.scrollLeft = cr.scrollLeft;
				self.onCreateHeader();
				self.refreshResizeColumn();
				self.refreshHeaderSortIcons();
				self.that._trigger("refreshHeadAsync")
			}
		},
		_resizeId: function(ci) {
			return "pq-resize-div-" + this.uuid + "-" + ci
		},
		_resizeCls: function() {
			return "pq-resize-div-" + this.uuid
		},
		_resizeDiv: function(ci) {
			return this.getById(this._resizeId(ci))
		},
		refreshResizeColumn: function() {
			var initH = this.initH,
				CM = this.colModel,
				column, resizeCls = this._resizeCls(),
				finalH = this.finalH,
				numberCell = this.numberCell,
				fc = this.freezeCols,
				buffer1 = [],
				buffer2 = [],
				buffer, lftCol, lft, id, ci = numberCell.show ? -1 : 0;
			this.$ele.find("." + resizeCls).remove();
			for (; ci <= finalH; ci++) {
				if (ci >= initH) {
					buffer = buffer2
				} else if (ci < fc) {
					buffer = buffer1
				} else {
					continue
				}
				column = ci >= 0 ? CM[ci] : numberCell;
				if (!column.hidden && column.resizable !== false && !this._resizeDiv(ci)) {
					lftCol = this.getLeft(ci + 1);
					lft = lftCol - 5;
					id = this._resizeId(ci);
					buffer.push("<div id='", id, "' pq-col-indx='", ci, "' style='", this.rtl, ":", lft, "px;'", " class='pq-grid-col-resize-handle " + resizeCls + "'>&nbsp;</div>")
				}
			}
			buffer1.length && this.$cleft.append(buffer1.join(""));
			buffer2.length && this.$cright.append(buffer2.join(""))
		},
		renderCell: function(ui) {
			var rd = ui.rowData,
				ci = ui.colIndx,
				attr = ui.attr,
				cls = ui.cls,
				style = ui.style,
				column = rd[ci],
				val;
			if (column) {
				if (column.colSpan > 1) {
					style.push("z-index:3;")
				}
				ui.column = column;
				return this.createHeaderCell(ui)
			} else {
				val = this.renderFilterCell(ui.column, ci, cls);
				return "<div " + attr + " class='" + cls.join(" ") + "' style='" + style.join("") + "'>" + val + "</div>"
			}
		}
	})
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		cRenderSum = pq.cRenderSum = function(that, $bottom) {
			var o = that.options,
				self = this,
				uuid = self.uuid = that.uuid;
			self.that = that;
			self.rtl = o.rtl ? "right" : "left";
			self.iMerge = {
				ismergedCell: function() {}
			};
			self.$ele = $bottom;
			self.height = "flex";
			self.scrollTop = 0;
			self.rowHt = o.rowHtSum || 27;
			self.cellCls = "pq-grid-cell";
			self.setTimer = self.setTimer(true);
			self.cellPrefix = "pq-sum-cell-u" + uuid + "-";
			self.rowPrefix = "pq-sum-row-u" + uuid + "-";
			self.preInit($bottom);
			that.on("refreshSum softRefresh", self.onRefresh.bind(self))
		};
	cRenderSum.prototype = $.extend({}, new _pq.cGenerateView, pq.cRenderHS, {
		isSum: function() {
			return true
		},
		onRefreshTimer: function(self, initHChanged) {
			return function() {
				var cr = self.$cright[0];
				self.autoRow && self.autoHeight({
					timer: false,
					hChanged: initHChanged
				});
				cr.scrollTop = 0;
				cr.scrollLeft = cr.scrollLeft
			}
		}
	})
})(jQuery);