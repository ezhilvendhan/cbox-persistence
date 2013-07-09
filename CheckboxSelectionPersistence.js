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
        me._validate(grid);
        me._totalRecords = me._getTotalData(grid.getStore().getProxy());
        me._initProxy = grid.getStore().getProxy();
        /*
            Adding the following methods on to the grid object:
            1. getSelection() - returns the selected records (Ext.data.Model) across pages in an array
            2. getSelectedData - returns selected data across pages in an array
            3. loadProxyData - void. Updates data on to the underlying PagingMemoryProxy and loads the first page
            4. totalSelection - Number. Returns the total number of data selected across the pages
        */
        grid.getSelection = me._getSelectedRecords;
        grid.getSelectedData = me._getSelectedData;
        grid.loadProxyData = function(data, sorters, filters) {
            var proxy = grid.getStore().getProxy();
            proxy.data = data;
            var store = grid.getStore();
            proxy.read(new Ext.data.Operation(Ext.apply({
                      action: 'update'
                  },
                  {
                      filters: filters || store.filters.items,
                      sorters: sorters || store.sorters.items
                  }
                  )),
                  //callback
                  function(){
                      me._totalRecords = me._getTotalData(store.getProxy());
                  },
                  proxy //scope
            );
            me._enableOrDisableFunctionalities(grid);
            store.loadPage(1);
        };
        grid.getStore().loadData = function(data, append) {
            if(append) {
                var proxy = grid.getStore().getProxy();
                if(data && proxy.data){
                    data = Ext.Array.merge(proxy.data, data);
                }
            }
            grid.loadProxyData(data);
        };
        grid.getTotalSelection = function() {
            return me._totalSelection;
        }
        /*
            Adding the following methods on to the CheckboxModel object:
            1. selectAllPages() - selects all records across pages. Ensure that this method is called
                                  instead of the CheckboxModel's selectAll() to select all records
                                  across pages. CheckboxModel's method can still be used to select all records
                                  on the current page but NOT across pages.
            2. deselectAllPages - Deselects all records across pages. Ensure that this method is called
                                  instead of the CheckboxModel's deselectAll() to deselect all records
                                  across pages. CheckboxModel's method can still be used to deselect all records
                                  on the current page but NOT across pages.
        */
        //Adding  selectAllPages()
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
                me._isAllSelected = true;
            }
            var selModel = grid.getSelectionModel();
            selModel.fireEvent('selectionchange', selModel, records);
        };
        //Adding  deselectAllPages()
        var deselectAllFn = grid.getSelectionModel().deselectAll;
        grid.getSelectionModel().deselectAllPages = function() {
            deselectAllFn.apply(grid.getSelectionModel(),
                    Array.prototype.slice.call(arguments, 0));
            me._deselectAll();
            var selModel = grid.getSelectionModel();
            selModel.fireEvent('selectionchange', selModel, []);
        };

        me._grid = grid;
        me.bindListeners();
    },
    destroy: function() {
        var me = this;
        me._resetVariables();
        me.unbindListeners();
    },
    bindListeners: function() {
        var me = this;
        //bind grid listeners
        me._bindGridListeners();

        //bindgrid store listeners
        me._bindStoreListeners();

        //selectionmodel listeners
        me._bindSelModelListeners();

        //pagingtoolbar listeners
        me._bindPagingToolbarListeners();
    },
    unbindListeners: function() {
        var me = this;
        //unbind grid listeners
        me._unbindGridListeners()

        //unbindgrid store listeners
        me._unbindStoreListeners();

        //unbinding selectionmodel listeners
        me._unbindSelModelListeners();

        //unbinding pagingtoolbar listeners
        me._unbindPagingToolbarListeners();
    },
    /**
     *Functions and variables declared below are strictly for the class' private use
     */
    _validate: function(grid) {
        if(! (grid.getSelectionModel() instanceof Ext.selection.CheckboxModel)) {
            throw "The Ext.ux.grid.CheckboxSelectionPersistence plugin is "+
                            "compatible only with a Grid using Ext.selection.CheckboxModel";
        }
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
                me._addSelection(i++, record[idx++], page);
            }
            //recursive call until the end of all records
            me._selectAll.call(me, store, record, idx, ++page, totalPages);
        }
    },
    _deselectAll: function () {
        var me = this;
        me._resetVariables();
    },
    _resetVariables: function() {
        //resetting all the internal data objects
        var me = this;
        me._isViewRefresh = false;
        me._previousSelection = me._selection;
        me._selection = {};
        me._totalSelection = 0;
        me._totalRecords = 0;
        me._isAllSelected = false;
        me._selectedData = [];
    },
    _bindGridListeners: function() {
        var me = this,
            grid = me._grid;
        grid.mon(
                grid, me._getListenerMap().grid);
    },
    _bindSelModelListeners: function() {
        var me = this,
            selModel = me._grid.getSelectionModel();
        selModel.mon(
                selModel, me._getListenerMap().selModel);
    },
    _bindPagingToolbarListeners: function() {
        var me = this,
            pagingToolbar = me._grid.getDockedItems('pagingtoolbar')[0];
        pagingToolbar.mon(
                pagingToolbar, me._getListenerMap().paginToolbar);
        //Adding toolbar on click of refresh button
        var refreshBtn = pagingToolbar.child('#refresh');
        refreshBtn.mon(refreshBtn,
                me._getListenerMap().pagingToolbarRefresh);
    },
    _bindStoreListeners: function() {
        var me = this,
            store = me._grid.getStore();
        store.mon(
                store, me._getListenerMap().store);
    },
    _unbindGridListeners: function() {
        var me = this,
            grid = me._grid;
        grid.mun(
                grid, me._getListenerMap().grid);
    },
    _unbindSelModelListeners: function() {
        var me = this,
            selModel = me._grid.getSelectionModel();
        selModel.mun(
                selModel, me._getListenerMap().selModel);
    },
    _unbindPagingToolbarListeners: function() {
        var me = this,
            pagingToolbar = me._grid.getDockedItems('pagingtoolbar')[0];
        pagingToolbar.mun(
                pagingToolbar, me._getListenerMap().paginToolbar);

        var refreshBtn = pagingToolbar.child('#refresh');
        refreshBtn.mun(refreshBtn,
                me._getListenerMap().pagingToolbarRefresh);
    },
    _unbindStoreListeners: function() {
        var me = this,
            store = me._grid.getStore();
        store.mun(
                store, me._getListenerMap().store);
    },
    _getListenerMap: function() {
        var me = this;
        //returns a simple listener Map containing all the listeners used by this class.
        return {
            grid: {
                sortchange: function(headerCt, col, dir, eOpts) {
                    var sorter = new Ext.util.Sorter({property: col, direction: dir});
                    me._resetVariables();
                    me._grid.loadProxyData(me._initProxy.data,sorter,null);
                }
            },
            selModel: {
                beforeselect: function(rowModel, record, idx, eOpts) {
                    if(idx < 0) {
                        return false;
                    }
                },
                select : function(rowModel, record, idx, eOpts) {
                    me._addSelection(idx, record, me._grid.getStore().currentPage);
                    //Once all records get selected
                    if(me._totalRecords === me._totalSelection) {
                        me._isAllSelected = true;
                    }
                },
                deselect : function (rowModel, record, idx, eOpts) {
                    if(!me._isViewRefresh) {
                        me._removeSelection(idx);
                        me._isAllSelected = false;
                    }
                },
                scope: me
            },
            paginToolbar: {
                  beforechange: function(toolbar, page, eOpts) {
                      me._isViewRefresh = true;
                  },
                  change : function(toolbar, page, eOpts) {
                        me._enableOrDisableFunctionalities();
                        me._totalRecords = me._getTotalData(me._grid.getStore().getProxy());
                        me._isViewRefresh = false;
                        //Upon each page change, records' checkboxes are selected, if already selected
                        if(!Ext.isEmpty(me._selection) && page
                                && page.currentPage) {
                            if(me._isNotSelectionModelLocked()) {
                                me._doSelect(page.currentPage);
                            } else {
                                me._grid.getSelectionModel().setLocked(false);
                                Ext.defer(function() { me._grid.getSelectionModel().setLocked(true)}, 1);
                                var totalDataInCurrentPage = me._grid.getStore().data ? me._grid.getStore().data.length : 0;
                                me._selectAllinThePage(totalDataInCurrentPage);
                            }
                        }
                  },
                  render: function() {
                        me._resetVariables();
                  },
                  scope: me
            },
            pagingToolbarRefresh: {
                  click: function() {
                        //vetoing refresh action if the selection model is locked
                        if(me._isNotSelectionModelLocked()) {
                            me._resetVariables();
                            return true;
                        } 
                        return false;
                        
                  }
            },
            store: {
                beforeload: function(store, records, isOpSuccessful, eOpts) {
                    me._isViewRefresh = true;
                },
                load: function(store, records, isOpSuccessful, eOpts) {
                    me._totalRecords = me._getTotalData(store.getProxy());
                    me._grid.getView().refresh();
                    me._isViewRefresh = false;
                },
                scope: me
            }
        };
    },
    _doSelect: function(pageNo) {
        var me = this,
            sel = me._selection[pageNo];
        if(! Ext.isEmpty(sel)) {
            for(var key in sel) {
                var idxNo = parseInt(key);
                me._grid.getSelectionModel().select(idxNo, true, true);
            }
        }
    },
    _selectAllinThePage: function(totalRecords) {
        var me = this;
        for(var idx = 0; idx < totalRecords; idx++) {
            me._grid.getSelectionModel().select(idx, true, true);
        }
    },
    _addSelection: function(idx, record, page) {
        var me = this,
            pageObj = me._selection[page];
        if(! pageObj) {
            pageObj = {};
        }
        if(Ext.isEmpty(pageObj[idx])) {
            ++me._totalSelection;
        }
        pageObj[idx] = record;
        me._selection[page] = pageObj;
    },
    _removeSelection: function(idx) {
        var me = this,
            page = me._grid.getStore().currentPage;
        var pageObj = me._selection[page];
        if(pageObj) {
            delete pageObj[idx];
            --me._totalSelection;
        }
    },
    _getSelectedRecords: function() {
        //scope used : grid
        var me = this.getPlugin("checkboxSelectionPersistence"),
            records = [];
        for(var pageKey in me._selection) {
            for(var key in me._selection[pageKey]) {
                 var tmp = me._selection[pageKey];
                 records.push(tmp[key]);
            }
        }
        return records;
    },
    _getSelectedData: function() {
        //Scope used: grid
        var me = this.getPlugin("checkboxSelectionPersistence"),
            records = [];
        for(var pageKey in me._selection) {
            for(var key in me._selection[pageKey]) {
                 var tmp = me._selection[pageKey];
                 records.push(tmp[key].data);
            }
        }
        //returns array of data objects
        return records;
    },
    _isNotSelectionModelLocked : function() {
        var me = this;
        return ! me._grid.getSelectionModel().isLocked();
    },
    _getTotalData: function(proxy) {
        return proxy.data ? proxy.data.length : 0;
    },
    _enableOrDisableFunctionalities: function(grid) {
        var me = this,
            grid = grid || me._grid,
            toolbar = grid.getDockedItems('pagingtoolbar')[0];
        if(me._isNotSelectionModelLocked()) {
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
    _isRefreshButtonEnabled: function() {
        var me = this;
        return ! (me._grid.getDockedItems('pagingtoolbar')[0]
                                        .child('#refresh').isDisabled());
    },
    //underlying grid component using this plugin
    _grid: null,
    //internal object that stores the data  as: {<page_no> : {<idx_within_the_page> : <Ext.data.Model>} }
    _selection: {},
    //flag to differentiate between data refresh using refresh button and grid view refresh
    _isViewRefresh: false,
    //stores previous _selection object
    _previousSelection: {},
    //flag to indicate if all records are selected
    _isAllSelected: false,
    //total number of records across all pages in the grid
    _totalRecords: 0,
    //total selections made across all pages in the grid
    _totalSelection: 0,
    //store the an array of selected data objects
    _selectedData: [],
    //initial proxy during grid creation
    _initProxy: null
});
