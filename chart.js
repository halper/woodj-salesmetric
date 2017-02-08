const PRODUCT_TYPE_SIZE = 2;
const SALE_TYPE_SIZE = 3;

var isCumulative = true;

var lastStartDate = moment().subtract(29, 'days');
var lastEndDate = moment();


function initRangePicker() {

    $('input[name="datefilter"]').daterangepicker({
        autoUpdateInput: false,
        locale: {
            cancelLabel: 'Clear'
        }
    });

    $('input[name="datefilter"]').on('apply.daterangepicker', function (ev, picker) {
        var id = $(this).attr('id');
        vm.$children[id].setRange(picker.startDate, picker.endDate);
    });

    $('input[name="datefilter"]').on('cancel.daterangepicker', function (ev, picker) {
        var id = $(this).attr('id');
        vm.$children[id].setRange('', '');
    });

}

var eventHub = new Vue();

var colors = {
    backgroundColor: [
        'rgba(255, 99, 132, 0.2)',
        'rgba(54, 162, 235, 0.2)',
        'rgba(255, 206, 86, 0.2)',
        'rgba(75, 192, 192, 0.2)',
        'rgba(153, 102, 255, 0.2)',
        'rgba(255, 159, 64, 0.2)'
    ],
    borderColor: [
        'rgba(255,99,132,1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)'
    ],
};

Vue.component('series-input', {
    template: '#series',
    mounted: function () {
        initRangePicker();
    },
    prop: ['compId', 'myRange'],
    data: function () {
        return {
            componentId: this.$parent.$data.numOfSeries,
            show: true,
            productType: "none",
            saleType: [],
            identifier: "",
            range: lastStartDate.format('YYYY-MM-DD') + ":" + lastEndDate.format('YYYY-MM-DD'),
        }
    },
    methods: {
        hideShowSeries: function () {
            this.show = !this.show;
            eventHub.$emit('show-feature-updated');
        },
        setRange: function (startDate, endDate) {
            if (startDate !== '') {
                var range;
                if (startDate.format('YYYY-MM-DD') === endDate.format('YYYY-MM-DD'))
                    range = startDate.format('YYYY-MM-DD');
                else
                    range = startDate.format('YYYY-MM-DD') + ':' + endDate.format('YYYY-MM-DD');
                this.range = range;
                lastStartDate = endDate;
                lastEndDate = startDate;
            } else {
                this.range = '';
            }
        },
    }
});


Vue.component('my-chart', {
    template: '<canvas id="myChart"></canvas>',
    created: function () {
        eventHub.$on('data-updated', this.updateData)
    },
    beforeDestroy: function () {
        eventHub.$off('data-updated', this.updateData)
    },
    methods: {
        updateData: function (data) {
            //console.log(data[0]);
            var chart = this.$parent.$data.myChart;

            if (data[0].type === "bar") {
                chart = new Chart(document.getElementById(this.$el.id).getContext('2d'), this.createBarGraph(chart, data));
            }
            else {
                chart = new Chart(document.getElementById(this.$el.id).getContext('2d'), this.createLineGraph(chart, data));
            }
            chart.update();
            this.$parent.$data.myChart = chart;
        },
        createBarGraph: function (chart, data) {
            var barData = [];
            var labelArr = [];
            var bgColors = [];
            var borderColors = [];
            for (var j = 0; j < data.length; j++) {
                var datum = data[j];
                var identifier = (datum.identifier === "") ? "" : (datum.identifier) + "_";
                var series = datum.series;
                barData.push(series.data[0]);
                labelArr.push(identifier + series.seriesName);
                bgColors.push(colors.backgroundColor[labelArr.length - 1]);
                borderColors.push(colors.borderColor[labelArr.length - 1]);
            }

            if (chart != null)
                chart.destroy();
            return {
                type: 'bar',
                data: {
                    labels: labelArr,
                    datasets: [{
                        label: '# of total sales',
                        data: barData,
                        backgroundColor: bgColors,
                        borderColor: borderColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero: true
                            }
                        }]
                    }
                }
            };
        },
        getCumulativeData: function (arrToBeSummed) {
            var respArr = [];
            var total = 0;
            for (var i = 0; i < arrToBeSummed.length; i++) {
                total += arrToBeSummed[i];
                respArr.push(total);
            }
            return respArr;
        },
        createLineGraph: function (chart, data) {
            var lineDatasets = [];

            for (var i = 0; i < data.length; i++) {
                var identifier = (data[i].identifier === "") ? "" : (data[i].identifier) + "_";
                var series = data[i].series;
                var seriesData = isCumulative ? this.getCumulativeData(series.data) : series.data;
                var dataSet = {
                    label: identifier + series.seriesName,
                    data: seriesData,
                    backgroundColor: colors.backgroundColor[lineDatasets.length],
                    borderColor: colors.borderColor[lineDatasets.length],
                    fill: false
                };
                lineDatasets.push(dataSet);
            }

            if (chart != null)
                chart.destroy();

            var config = {
                type: 'line',
                data: {
                    labels: data[0].labels,
                    datasets: lineDatasets
                },
                options: {
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero: true
                            }
                        }]
                    },
                }
            };
            return config;
        }
    }

});
var vm = new Vue({
    el: '#my-app',
    created: function () {
        eventHub.$on('show-feature-updated', this.updateChart);
    },
    beforeDestroy: function () {
        eventHub.$off('show-feature-updated', this.updateChart);
    },
    data: {
        error: "",
        myChart: null,
        numOfSeries: 1,
        chartData: null,
        cumulativeText: "Get individual data",
        chartType: null,
        isChartInit: false,
    },
    mounted: function () {
        this.getFetchChartData();
    },
    methods: {
        getFetchChartData: function () {
            this.$http.get('api.php')
                .then(function (response) {
                    var data = response.data.rows;
                    this.chartData = [];
                    for (var i = 0; i < data.length; i++) {
                        var obj = data[i];
                        this.chartData.push(new Sale(obj));
                    }
                });
        },
        changeLineChart: function () {
            isCumulative = !isCumulative;
            this.cumulativeText = isCumulative ? "Get individual data" : "Get cumulative data";
            this.updateChart();
        },
        createSeriesComponentAndInitDateRange: function () {
            this.numOfSeries++;
        },
        updateChart: function () {
            this.isChartInit = true;
            var finalData = [];
            this.error = "";
            for (var i = 1; i < this.$children.length; i++) {
                var filteredData = [];
                var childData = this.$children[i].$data;
                if (!childData.show)
                    continue;
                var chartType;
                var label;
                if (childData != null || childData !== "") {

                    var childDataProTypeArr = [];
                    if (childData.productType !== "none")
                        childDataProTypeArr.push(childData.productType);
                    else {
                        if (childData.saleType.length > 0)
                            childDataProTypeArr = ["50/50", "Dreamhome"];
                    }

                    if (childDataProTypeArr.length == 0) {
                        this.error = "You should select at least one sale type!";
                        return;
                    }

                    if (childDataProTypeArr.length > 0) {
                        filteredData = this.filterDataByDate(childData.range);
                        chartType = "line" in filteredData ? "line" : "bar";
                        filteredData = this.filterProductTypeWithSales(childDataProTypeArr, childData.saleType, filteredData);
                        label = filteredData.labels;
                        delete filteredData["labels"];
                    }
                }

                if (filteredData != null || (filteredData.data !== undefined && filteredData.data.length > 0)) {
                    finalData.push({
                        identifier: childData.identifier,
                        series: filteredData,
                        type: chartType,
                        labels: label
                    });
                    this.chartType = chartType;
                } else {
                    this.error = "There is no data to display for given date range!";
                    return;
                }
            }
            if (finalData != null && finalData.length > 0) {
                eventHub.$emit('data-updated', finalData);
            } else {
                this.error = "There is no data to display for given date range!";
            }
        },
        filterDataByDate: function (date) {
            var respArr = [];
            var res = date.split(":");
            var startDate, endDate;
            if (res.length > 1) {
                startDate = moment(res[0], "YYYY-MM-DD");
                endDate = moment(res[1], "YYYY-MM-DD");
                respArr["line"] = this.getSalesForLineDataFromDates(startDate, endDate);
            } else {
                startDate = moment(date, "YYYY-MM-DD");
                respArr["bar"] = this.getSalesBarDataFromDate(startDate);
            }
            return respArr;
        },
        getSalesForLineDataFromDates: function (startDate, endDate) {
            var respArr = [];
            var countingDay = startDate;
            while (!countingDay.isAfter(endDate)) {
                var key = countingDay.format('YYYY-MM-DD');
                respArr[key] = [];
                for (var i = 0; i < this.chartData.length; i++) {
                    var sale = this.chartData[i];
                    if (sale.fullDate.isSame(countingDay)) {
                        respArr[key].push(sale);
                    }
                }
                countingDay.add(1, "days");
            }
            return respArr;
        },
        getSalesBarDataFromDate: function (date) {
            var responseArr = [];
            for (var i = 0; i < this.chartData.length; i++) {
                var sale = this.chartData[i];
                if (date.isSame(sale.fullDate)) {
                    responseArr.push(sale);
                }
            }
            return responseArr;
        },
        /**
         * This method filter data and returns object for single series!
         * @param productArr
         * @param saleTypeArr
         * @param filteredSalesData
         * @returns object for single series
         */
        filterProductTypeWithSales: function (productArr, saleTypeArr, filteredSalesData) {
            var responseArr = {labels: [], seriesName: "", data: []};
            var chartType = "line" in filteredSalesData ? "line" : "bar";
            var allSaleTypesLabel = saleTypeArr.length == SALE_TYPE_SIZE ? "All Sale Types" : this.getSeriesName("", saleTypeArr).replace("(", "").replace(")", "");

            for (var i = 0; i < productArr.length; i++) {
                var product = productArr[i];
                if (chartType === "line") {
                    var chartData = filteredSalesData.line;
                    var j = 0;
                    for (var key in chartData) {
                        var sales = chartData[key];
                        var total = this.getTotalSalesForProductFromSaleTypes(sales, product, saleTypeArr);
                        if (i == 0) {
                            responseArr.labels.push(moment(key, 'YYYY-MM-DD').format('MM-DD'));
                            responseArr.data.push(total);
                        }
                        else
                            responseArr.data[j] = total + responseArr.data[j];

                        j++;
                    }
                } else {
                    var sales = filteredSalesData.bar;
                    var total = this.getTotalSalesForProductFromSaleTypes(sales, product, saleTypeArr);
                    if (i == 0) {
                        responseArr.data.push(total);
                    }
                    else
                        responseArr.data[0] = total + responseArr.data[0];
                }
                responseArr.seriesName = this.getSeriesName(product, [allSaleTypesLabel]);
            }
            if (productArr.length == PRODUCT_TYPE_SIZE) {
                responseArr["seriesName"] = this.getSeriesName(allSaleTypesLabel, ["All Products"]);
            }
            return responseArr;
        },

        getSeriesName: function (prefix, appendices) {
            var seriesName = prefix;
            for (var i = 0; i < appendices.length; i++) {
                if (i == 0) {
                    seriesName += "(";
                }
                var appendix = appendices[i];
                seriesName += appendix;
                if (i + 1 != appendices.length)
                    seriesName += "_"
            }
            return seriesName + ")";
        },
        getTotalSalesForProductFromSaleTypes: function (sales, product, saleTypeArr) {
            var total = 0;
            for (var i = 0; i < sales.length; i++) {
                var sale = sales[i];
                if (sale.productType.toLowerCase() === product.toLowerCase()) {
                    for (var j = 0; j < saleTypeArr.length; j++) {
                        var saleType = saleTypeArr[j];
                        if (sale.saleType === saleType) {
                            total += sale.total;
                        }
                    }
                }
            }
            return total;
        },

    }

});