export class OlympicWinnerChart {
    render(options) {
        const {data, containerId} = options;
        console.log(data);
        const years = _.chain(data).map(x => x.year).orderBy().uniq().value();
        const data1 = _.chain(data)
            .orderBy(['year'])
            .map(x => {

                return {
                    x: years.indexOf(x.year),
                    y: x.total,
                    name: x.sport,
                }
            }).value();

        Highcharts.chart(containerId, {
            chart: {
                type: 'column'
            },
            title: {
                text: 'Stacked column chart'
            },
            xAxis: {
                categories: years
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Total'
                },
                stackLabels: {
                    enabled: true,
                    style: {
                        fontWeight: 'bold',
                        color: ( // theme
                            Highcharts.defaultOptions.title.style &&
                            Highcharts.defaultOptions.title.style.color
                        ) || 'gray'
                    }
                }
            },
            legend: {
                align: 'right',
                x: -30,
                verticalAlign: 'top',
                y: 25,
                floating: true,
                backgroundColor:
                    Highcharts.defaultOptions.legend.backgroundColor || 'white',
                borderColor: '#CCC',
                borderWidth: 1,
                shadow: false
            },
            tooltip: {
                headerFormat: '<b>{point.x}</b><br/>',
                pointFormat: '{series.name}: {point.y}<br/>Total: {point.stackTotal}'
            },
            plotOptions: {
                column: {
                    stacking: 'normal',
                    dataLabels: {
                        enabled: true
                    }
                }
            },
            series: [{data:data1}],
            // series: [{
            //     name: 'John',
            //     data: [5, 3, 4, 7, 2]
            // }, {
            //     name: 'Jane',
            //     data: [2, 2, 3, 2, 1]
            // }, {
            //     name: 'Joe',
            //     data: [3, 4, 4, 2, 5]
            // }]
        });
    }
}