checkbox-selection-persistence
==============================

An ExtJS plugin to persist checkbox selections across pages, while using Ext.ux.data.PagingMemoryProxy.
[You can get PagingMemoryProxy from ux folder in extjs installation]

The requisites are : ExtJs Grid with a store using pagingmemoryproxy, 
  				 Checkbox selection model.


Allows checkbox selection persistence in a grid, across pages. Make sure the grid uses a CheckboxModel 
and the store is built with a Ext.ux.data.PagingMemoryProxy.
	
The Following methods will be added to the underlying grid object:
	1. `getSelection()` - returns the selected records (Ext.data.Model) across pages in an array
    2. `getSelectedData` - returns selected data across pages in an array
    3. `loadProxyData` - void. Updates data on to the underlying PagingMemoryProxy and loads the first page
    4. `totalSelection` - Number. Returns the total number of data selected across the pages

The Following methods will be added to the underlying CheckboxModel object:
    1. `selectAllPages()` - selects all records across pages. Ensure that this method is called
                          instead of the CheckboxModel's selectAll() to select all records
                          across pages.
    2. `deselectAllPages` - Deselects all records across pages. Ensure that this method is called
                          instead of the CheckboxModel's deselectAll() to deselect all records
                          across pages.

Installation
============
`````javascript
Ext.create('Ext.grid.Panel', {
        id: 'gridPanel',
        store: userStore,
        ....
        plugins: ['checkboxselpersistence'],
	    selType:'checkboxmodel',
	    dockedItems: [{
	        xtype: 'pagingtoolbar',
	        store: userStore,   // same store GridPanel is using
	        dock: 'bottom',
	        displayInfo: true
	    }]
});
`````

Sample
======
Data
`````javascript
var __data = [
                { "name": "1", "email": "1@simpsons.com", "phone": "555-111-1224" },
                { "name": "2", "email": "2@simpsons.com", "phone": "555-222-1234" },
                { "name": "3", "email": "3@simpsons.com", "phone": "555-222-1244" },
                { "name": "4", "email": "4@simpsons.com", "phone": "555-222-1254" },
                { "name": "5", "email": "5@simpsons.com", "phone": "555-111-1224" },
                { "name": "6", "email": "6@simpsons.com", "phone": "555-222-1234" },
                { "name": "7", "email": "7@simpsons.com", "phone": "555-222-1244" },
                { "name": "8", "email": "8@simpsons.com", "phone": "555-222-1254" },
                { "name": "9", "email": "9@simpsons.com", "phone": "555-111-1224" },
                { "name": "10", "email": "10@simpsons.com", "phone": "555-222-1234" },
                { "name": "11", "email": "11@simpsons.com", "phone": "555-222-1244" },
                { "name": "12", "email": "12@simpsons.com", "phone": "555-222-1254" },
                { "name": "13", "email": "13@simpsons.com", "phone": "555-111-1224" },
                { "name": "14", "email": "14@simpsons.com", "phone": "555-222-1234" },
                { "name": "15", "email": "15@simpsons.com", "phone": "555-222-1244" },
                { "name": "16", "email": "16@simpsons.com", "phone": "555-222-1254" }
];
`````

Model
`````javascript
Ext.define('User', {
	    extend: 'Ext.data.Model',
	    fields: [ 'name', 'email', 'phone' ]
});
`````

Store
`````javascript
var userStore = Ext.create('Ext.data.ArrayStore', {
        model: 'User',
        pageSize: 6,
        autoLoad: true,
        data: __data,
        proxy: {
            type: 'pagingmemory'
	    }
});
`````

Grid
`````javascript
Ext.create('Ext.grid.Panel', {
        id: 'gridPanel',
	    renderTo: Ext.getBody(),
	    store: userStore,
	    width: 400,
	    height: 200,
	    title: 'Application Users',
	    columns: [
	        {
	            text: 'Name',
	            width: 100,
	            sortable: true,
	            hideable: false,
	            dataIndex: 'name'
	        },
	        {
	            text: 'Email Address',
	            width: 150,
	            dataIndex: 'email'
	        },
	        {
	            text: 'Phone Number',
	            flex: 1,
	            dataIndex: 'phone'
	        }
	    ],
	    selModel : {
            mode: 'SIMPLE'
	    },
	    plugins: ['checkboxselpersistence'],
	    selType:'checkboxmodel',
	    dockedItems: [{
	        xtype: 'pagingtoolbar',
	        store: userStore,   // same store GridPanel is using
	        dock: 'bottom',
	        displayInfo: true
	    }]
});
`````

Feel free to improve the code!
