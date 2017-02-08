/**
 * Created by alper on 12/22/16.
 */

// Sale class as object
var Sale = function (data) {
    this.id = data.id;
    this.year = data.year;
    this.date = data.date;
    this.total = data.total;
    this.productType = data.type.replace(" Ticket", "");
    this.productType = this.productType.replace(" ", "");
    this.saleType = data.sale.replace(" Sale", "");
    this.fullDate = moment(this.year + "-" + this.date, 'YYYY-MM-DD');
    this.toString = function(){
        return this.productType + " (" + this.saleType + ")";
    }
};