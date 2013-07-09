Ext.onReady(function() {
	//Model
	Ext.define('User', {
	    extend: 'Ext.data.Model',
	    fields: [ 'name', 'email', 'phone' ]
	});
	
	//Data
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
	
	//Store
    var userStore = Ext.create('Ext.data.ArrayStore', {
        model: 'User',
        pageSize: 6,
        autoLoad: true,
        data: __data,
        proxy: {
            type: 'pagingmemory'
	    }
    });

	//Grid
	Ext.create('Ext.grid.Panel', {
	    renderTo: Ext.getBody(),
	    store: userStore,
	    width: 400,
	    height: 200,
	    title: 'Application Users',
        plugins: ['checkboxselpersistence'],
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
	    selType:'checkboxmodel',
	    selModel : {
            mode: 'SIMPLE'
	    },
	    dockedItems: [{
	        xtype: 'pagingtoolbar',
	        store: userStore,   // same store GridPanel is using
	        dock: 'bottom',
	        displayInfo: true
	    }]
	});
})