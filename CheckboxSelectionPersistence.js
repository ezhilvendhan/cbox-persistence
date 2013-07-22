/**
 * @class Ext.ux.grid.CheckboxSelectionPersistence
 * @extends Ext.AbstractPlugin
 * <p>Allows checkbox selection persistence in a grid, across pages.
 *    Make sure the grid uses a CheckboxModel and the store is built with a
 *    Ext.ux.data.PagingMemoryProxy.
 *    The Following methods will be added to the underlying grid object:
            1. getSelection() - returns the selected records (Ext.data.Model) across pages in an array
            2. getSelectedData - returns selected data across pages in an array
            3. loadProxyData - void. Updates data on to the underlying PagingMemoryProxy and loads the first page
            4. totalSelection - Number. Returns the total number of data selected across the pages

      The Following methods will be added to the underlying CheckboxModel object:
            1. selectAllPages() - selects all records across pages. Ensure that this method is called
                                  instead of the CheckboxModel's selectAll() to select all records
                                  across pages. CheckboxModel's method can still be used to select all records
                                  on the current page but NOT across pages.
            2. deselectAllPages - Deselects all records across pages. Ensure that this method is called
                                  instead of the CheckboxModel's deselectAll() to deselect all records
                                  across pages. CheckboxModel's method can still be used to deselect all records
                                  on the current page but NOT across pages.
 * </p>
 */
Ext.define('Ext.ux.grid.CheckboxSelectionPersistence', {
    alias: 'plugin.checkboxselpersistence',
    extend: 'Ext.AbstractPlugin',
    pluginId: 'checkboxSelectionPersistence',

    init : function(grid) {
        var me = this;
        me.validatePluginUsage(grid);
        me.totalRecordsAcrossAllPages = me.getTotalDataInTheProxy(grid.getStore().getProxy());
        me.proxyCreatedInitiallyDuringGridCreation = grid.getStore().getProxy();
        me.addFunctionsToGrid(grid, me);
        me.overrideGridStoreLoadDataFn(grid);
        me.addFunctionsToGridCheckboxModel(grid, me);
        me.thisGrid = grid;
        me.bindListeners();
    },
    destroy: function() {
        var me = this;
        me.resetAllPluginVariables();
        me.unbindListeners();
    },
    addFunctionsToGrid: function(grid, me) {
        grid.getSelection = me.getSelectedRecords;
        grid.getSelectedData = me.getSelectedData;
        me.addLoadProxyDataFn(grid, me);
        me.addGetTotalSelectionFn(grid, me);
    },
    addLoadProxyDataFn: function(grid, me) {
        grid.loadProxyData = function(data, sorters, filters) {
            var proxy = grid.getStore().getProxy();
            proxy.data = data;
            var store = grid.getStore();
            proxy.read(new Ext.data.Operation(Ext.apply(
                          {
                      action: 'update'
                  },
                  {
                      filters: filters || store.filters.items,
                      sorters: sorters || store.sorters.items
                  }
                  )),
                  function(){
                      me.totalRecordsAcrossAllPages = me.getTotalDataInTheProxy(store.getProxy());
                  },
                  proxy
            );
            me.enableOrDisableRefreshButton(grid);
            store.loadPage(1);
        };
    },
    addGetTotalSelectionFn: function(grid, me) {
        grid.getTotalSelection = function() {
            return me.totalSelectionsAcrossAllPages;
        }
    },
    overrideGridStoreLoadDataFn: function(grid) {
        grid.getStore().loadData = function(data, append) {
            if(append) {
                var proxy = grid.getStore().getProxy();
                if(data && proxy.data){
                    data = Ext.Array.merge(proxy.data, data);
                }
            }
            grid.loadProxyData(data);
        };
    },
    addFunctionsToGridCheckboxModel: function(grid, me) {
        me.addSelectAllPagesFn(grid, me);
        me.addDeselectAllFn(grid, me);
    },
    addSelectAllPagesFn: function(grid, me) {
        var selectAllFn = grid.getSelectionModel().selectAll;
        grid.getSelectionModel().selectAllPages = function() {
            selectAllFn.apply(grid.getSelectionModel(),
                    Array.prototype.slice.call(arguments, 0));
            var allData = grid.getStore().getProxy().data;
            if(! Ext.isEmpty(allData)) {
                var records = grid.getStore().getProxy().getReader().read(allData).records;
                me._selectAll(grid.getStore(),
                        records, 0, 1,
                        grid.getStore().getPageFromRecordIndex(allData.length));
                me.isAllRecordsSelectedAcrossPages = true;
            }
            var selModel = grid.getSelectionModel();
            selModel.fireEvent('selectionchange', selModel, records);
        };
    },
    addDeselectAllFn: function(grid, me) {
        var deselectAllFn = grid.getSelectionModel().deselectAll;
        grid.getSelectionModel().deselectAllPages = function() {
            deselectAllFn.apply(grid.getSelectionModel(),
                    Array.prototype.slice.call(arguments, 0));
            me.deselectAllRecordsAcrossPages();
            var selModel = grid.getSelectionModel();
            selModel.fireEvent('selectionchange', selModel, []);
        };
    },
    bindListeners: function() {
        var me = this;
        me.bindGridListeners();
        me.bindStoreListeners();
        me.bindSelectionModelListeners();
        me.bindPagingToolbarListeners();
    },
    unbindListeners: function() {
        var me = this;
        me.unbindGridListeners()
        me.unbindStoreListeners();
        me.unbindSelectionModelListeners();
        me.unbindPagingToolbarListeners();
    },
    validatePluginUsage: function(grid) {
    	var me = this;
        me.isTheGridMadeOfCheckboxModel(grid);
        me.isTheGridMadeOfPagingMemoryProxy(grid);
    },
    isTheGridMadeOfCheckboxModel: function(grid) {
        if(! (grid.getSelectionModel() instanceof Ext.selection.CheckboxModel)) {
            throw "The Ext.ux.grid.CheckboxSelectionPersistence plugin is "+
                            "compatible only with a Grid using Ext.selection.CheckboxModel";
        }
    },
    isTheGridMadeOfPagingMemoryProxy: function(grid) {
        if(! (grid.getStore().getProxy() instanceof Ext.ux.data.PagingMemoryProxy)) {
            throw "The Ext.ux.grid.CheckboxSelectionPersistence plugin is "+
                            "compatible only with a Store using Ext.ux.data.PagingMemoryProxy";
        }
    },
    _selectAll: function _selectAll(store, record, idx, page, totalPages) {
        var me = this;
        //idx is independent of the page. It is the overall index in the records array
        if(idx < record.length) {
            var i=0;
            //selecting all records in a page
            while((page === store.getPageFromRecordIndex(idx)) &&
                        idx < record.length) {
                //Adding the record to this class' selection object
                me.addRecordToCache(i++, record[idx++], page);
            }
            me._selectAll.call(me, store, record, idx, ++page, totalPages);
        }
    },
    deselectAllRecordsAcrossPages: function () {
        var me = this;
        me.resetAllPluginVariables();
    },
    resetAllPluginVariables: function() {
        //resetting all the internal data objects
        var me = this;
        me.isRefreshNotByRefreshButton = false;
        me.previousSelectionCache = me.selectionCache;
        me.selectionCache = {};
        me.totalSelectionsAcrossAllPages = 0;
        me.totalRecordsAcrossAllPages = 0;
        me.isAllRecordsSelectedAcrossPages = false;
        me.selectedDataObjectsAcrossPages = [];
    },
    bindGridListeners: function() {
        var me = this,
            grid = me.thisGrid;
        grid.mon(grid, me.getGridListeners());
    },
    bindSelectionModelListeners: function() {
        var me = this,
            selModel = me.thisGrid.getSelectionModel();
        selModel.mon(selModel, me.getSelectionModelListeners());
    },
    bindPagingToolbarListeners: function() {
        var me = this,
            pagingToolbar = me.thisGrid.getDockedItems('pagingtoolbar')[0];
        pagingToolbar.mon(pagingToolbar, me.getPagingToolbarListeners());
        me.bindPagingToolbarRefreshBtnListeners(pagingToolbar, me);
    },
    bindPagingToolbarRefreshBtnListeners: function(pagingToolbar, me) {
    	var refreshBtn = pagingToolbar.child('#refresh');
        refreshBtn.mon(refreshBtn,me.getPagingToolbarRefreshBtnListeners());
    }, 
    bindStoreListeners: function() {
        var me = this,
            store = me.thisGrid.getStore();
        store.mon(store, me.getStoreListeners());
    },
    unbindGridListeners: function() {
        var me = this,
            grid = me.thisGrid;
        grid.mun(grid, me.getGridListeners());
    },
    unbindSelectionModelListeners: function() {
        var me = this,
            selModel = me.thisGrid.getSelectionModel();
        selModel.mun(selModel, me.getSelectionModelListeners());
    },
    unbindPagingToolbarListeners: function() {
        var me = this,
            pagingToolbar = me.thisGrid.getDockedItems('pagingtoolbar')[0];
        pagingToolbar.mun(pagingToolbar, me.getPagingToolbarListeners());
		me.unbindPagingToolbarRefreshBtnListeners(pagingToolbar, me);
    },
    unbindPagingToolbarRefreshBtnListeners: function(pagingToolbar, me) {
    	var refreshBtn = pagingToolbar.child('#refresh');
        refreshBtn.mun(refreshBtn, me.getPagingToolbarRefreshBtnListeners());
    },
    unbindStoreListeners: function() {
        var me = this,
            store = me.thisGrid.getStore();
        store.mun(store, me.getStoreListeners());
    },
    getGridListeners: function() {
    	var me = this;
    	return {
            sortchange: function(headerCt, col, dir, eOpts) {
                var sorter = new Ext.util.Sorter({property: col, direction: dir});
                me.resetAllPluginVariables();
                me.thisGrid.loadProxyData(me.proxyCreatedInitiallyDuringGridCreation.data,sorter,null);
            }
        };
    },
    getSelectionModelListeners: function() {
    	var me = this;
    	return {
            beforeselect: function(rowModel, record, idx, eOpts) {
                if(idx < 0) {
                    return false;
                }
            },
            select : function(rowModel, record, idx, eOpts) {
                me.addRecordToCache(idx, record, me.thisGrid.getStore().currentPage);
                //Once all records get selected
                if(me.totalRecordsAcrossAllPages === me.totalSelectionsAcrossAllPages) {
                    me.isAllRecordsSelectedAcrossPages = true;
                }
            },
            deselect : function (rowModel, record, idx, eOpts) {
                if(!me.isRefreshNotByRefreshButton) {
                    me.removeRecordFromCache(idx);
                    me.isAllRecordsSelectedAcrossPages = false;
                }
            },
            scope: me
        };
    },
    getPagingToolbarListeners: function() {
    	var me = this;
    	return {
              beforechange: function(toolbar, page, eOpts) {
                  me.isRefreshNotByRefreshButton = true;
              },
              change : function(toolbar, page, eOpts) {
                    me.enableOrDisableRefreshButton();
                    me.totalRecordsAcrossAllPages = me.getTotalDataInTheProxy(me.thisGrid.getStore().getProxy());
                    me.isRefreshNotByRefreshButton = false;
                    if(!Ext.isEmpty(me.selectionCache) && page && page.currentPage) {
                        if(me.isNotSelectionModelLocked()) {
                            me.selectExistingSelectionsInPage(page.currentPage);
                        } else {
                            me.thisGrid.getSelectionModel().setLocked(false);
                            Ext.defer(function() { me.thisGrid.getSelectionModel().setLocked(true)}, 1);
                            var totalDataInCurrentPage = me.thisGrid.getStore().data ? me.thisGrid.getStore().data.length : 0;
                            me.selectAllRecordsInThePage(totalDataInCurrentPage);
                        }
                    }
              },
              render: function() {
                    me.resetAllPluginVariables();
              },
              scope: me
        };
    
    },
    getPagingToolbarRefreshBtnListeners: function() {
    	var me = this;
    	return {
              click: function() {
                    //vetoing refresh action if the selection model is locked
                    if(me.isNotSelectionModelLocked()) {
                        me.resetAllPluginVariables();
                        return true;
                    } 
                    return false;  
              }
        };
    },
    getStoreListeners: function() {
    	 var me = this;
    	 return {
            beforeload: function(store, records, isOpSuccessful, eOpts) {
                me.isRefreshNotByRefreshButton = true;
            },
            load: function(store, records, isOpSuccessful, eOpts) {
                me.totalRecordsAcrossAllPages = me.getTotalDataInTheProxy(store.getProxy());
                me.thisGrid.getView().refresh();
                me.isRefreshNotByRefreshButton = false;
            },
            scope: me
        };
    },
    selectExistingSelectionsInPage: function(pageNo) {
        var me = this,
            sel = me.selectionCache[pageNo];
        if(! Ext.isEmpty(sel)) {
            for(var key in sel) {
                var idxNo = parseInt(key);
                me.thisGrid.getSelectionModel().select(idxNo, true, true);
            }
        }
    },
    selectAllRecordsInThePage: function(totalRecords) {
        var me = this;
        for(var idx = 0; idx < totalRecords; idx++) {
            me.thisGrid.getSelectionModel().select(idx, true, true);
        }
    },
    addRecordToCache: function(idx, record, page) {
        var me = this,
            pageObj = me.selectionCache[page];
        if(! pageObj) {
            pageObj = {};
        }
        if(Ext.isEmpty(pageObj[idx])) {
            ++me.totalSelectionsAcrossAllPages;
        }
        pageObj[idx] = record;
        me.selectionCache[page] = pageObj;
    },
    removeRecordFromCache: function(idx) {
        var me = this,
            page = me.thisGrid.getStore().currentPage;
        var pageObj = me.selectionCache[page];
        if(pageObj) {
            delete pageObj[idx];
            --me.totalSelectionsAcrossAllPages;
        }
    },
    getSelectedRecords: function() {
        var me = this.getPlugin("checkboxSelectionPersistence"),
            records = [];
        for(var pageKey in me.selectionCache) {
            for(var key in me.selectionCache[pageKey]) {
                 var tmp = me.selectionCache[pageKey];
                 records.push(tmp[key]);
            }
        }
        return records;
    },
    getSelectedData: function() {
        var me = this.getPlugin("checkboxSelectionPersistence"),
            records = [];
        for(var pageKey in me.selectionCache) {
            for(var key in me.selectionCache[pageKey]) {
                 var tmp = me.selectionCache[pageKey];
                 records.push(tmp[key].data);
            }
        }
        return records;
    },
    isNotSelectionModelLocked : function() {
        var me = this;
        return ! me.thisGrid.getSelectionModel().isLocked();
    },
    getTotalDataInTheProxy: function(proxy) {
        return proxy.data ? proxy.data.length : 0;
    },
    enableOrDisableRefreshButton: function(grid) {
        var me = this,
            grid = grid || me.thisGrid,
            toolbar = grid.getDockedItems('pagingtoolbar')[0];
        if(me.isNotSelectionModelLocked()) {
            toolbar.child('#refresh').enable();
            if(grid.headerCt) {
                grid.headerCt.setDisabled(false);
            }
        } else {
            toolbar.child('#refresh').setDisabled(true);
            if(grid.headerCt) {
                grid.headerCt.setDisabled(true);
            }
        }
    },
    isRefreshButtonEnabled: function() {
        var me = this;
        return ! (me.thisGrid.getDockedItems('pagingtoolbar')[0]
                                        .child('#refresh').isDisabled());
    },
    thisGrid: null,
    selectionCache: {}, //Format: {<page_no> : {<idx_within_the_page> : <Ext.data.Model>} }
    isRefreshNotByRefreshButton: false,
    previousSelectionCache: {},//stores previous selectionCache object
    isAllRecordsSelectedAcrossPages: false,
    totalRecordsAcrossAllPages: 0,
    totalSelectionsAcrossAllPages: 0,
    selectedDataObjectsAcrossPages: [],
    proxyCreatedInitiallyDuringGridCreation: null
});
