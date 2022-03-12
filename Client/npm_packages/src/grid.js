import pq from 'pqgrid';
import 'pqgrid/localize/pq-localize-en.js';
import 'jquery-ui-pack/jquery-ui.css';
import 'jquery-ui-pack/jquery-ui.structure.css';
import 'jquery-ui-pack/jquery-ui.theme.css';
import 'pqgrid/pqgrid.min.css';
import 'pqgrid/pqgrid.ui.min.css';
import 'pqgrid/themes/steelblue/pqgrid.css';

function renderGrid(options) {
    const {data, containerId} = options;

    function groupChg(val) {
        var lower = Math.floor(val / 10) * 10,
            upper = Math.ceil((val + 1) / 10) * 10;
        return lower + " < " + upper;
    }

    const colM = [
        {title: "Sport", dataIndx: "sport", width: 110},
        {title: "Athlete", dataIndx: "athlete", width: 200},
        {
            title: "Age", dataIndx: "age", width: 90, align: 'center', dataType: 'integer',
            groupChange: groupChg
        },
        {
            title: "Gold", dataIndx: "gold", width: 100, dataType: 'integer',
            tpCls: 'gold', denyGroup: true, denyPivot: true
        },
        {title: "Silver", dataIndx: "silver", width: 100, dataType: 'integer', denyGroup: true},
        {title: "Bronze", dataIndx: "bronze", width: 100, dataType: 'integer', denyGroup: true},
        {title: "Total", dataIndx: 'total', width: 100, dataType: 'integer', denyGroup: true},
        {title: "Country", dataIndx: "country", width: 120},
        {title: "Year", dataIndx: "year", width: 90, dataType: 'integer'}
        //{title: "Date", dataIndx: "date", dataType:'date', width: 110},            
    ];

    colM.forEach(function (col) {
        col.menuIcon = true;
        col.filter = {condition: 'range'};
    });

    const groupModel = {
        on: true, //grouping mode.            
        checkbox: true, checkboxHead: true, select: true,
        titleInFirstCol: true,
        indent: 20, fixCols: false,
        groupCols: ['year'], //grouping along column axis.
        agg: { //aggregate fields.
            gold: 'sum',
            silver: 'sum',
            bronze: 'sum',
            total: 'sum'
        },
        headerMenu: false,
        grandSummary: true, //show grand summary row.           
        dataIndx: ['country', 'sport'], //grouping along row axis.
        collapsed: [false, false],
        useLabel: true,
        summaryEdit: false
    };
    // const dataModel = {
    //     location: "remote",
    //     cache: true,
    //     url: "/Content/olympicWinners.json",
    //     getData: function (data) {
    //         return {data: data};
    //     }
    // };

    const obj = {
        height: 500,
        virtualWin: true,
        dataModel: {data},
        numberCell: {width: 50},
        //freezeCols: 1,
        flex: {one: true},
        rowBorders: false,
        colModel: colM,
        groupModel: groupModel,
        //sortModel: { sorter:[{dataIndx: 'country'}] },            
        summaryTitle: {
            avg: "",
            count: '',
            max: "",
            min: "",
            stdev: "",
            stdevp: "",
            sum: ""
        },
        formulas: [['total', function (rd) {
            const total = rd.gold + rd.silver + rd.bronze;
            return isNaN(total) ? "" : total;
        }]],
        showTitle: false,
        wrap: false,
        hwrap: false,
        editable: false,
    };
    pq.grid(`#${containerId}`, obj);
}

window.renderGrid = renderGrid;