// static observer to detect changes in system
// tracks generated attributes and applies them once the notificationbar has finished loading
var WebAppObserver = {
  observers: {},

  init: function() {
    console.log("Started WebAppObserver");
  },

  notify: function(attribute) {
    if (this.observers.hasOwnProperty(attribute)) {
      // add additional attribute calculations as required
      switch(attribute) {
        case "currency":
          Wizard.setCurrencyByCode(this.observers.currency);
          break;
        case "items":
          $.each(value, function(itemKey, itemValue) {
            console.log(itemValue);
            Wizard.itemTable.addDataRow(itemValue);
          });
          break;
        case "taxes":
          $.each(value, function(taxKey, taxValue) {
            console.log(taxValue);
            Wizard.taxTable.addDataRow(taxValue);
          });
          break;
      }
      this.removeObserver(attribute);
    }
  },

  addObserver: function(attribute, value) {
    this.observers[attribute] = value;
  },

  removeObserver: function(attribute) {
    delete this.observers[attribute];
  },

  hasObserver: function(attribute) {
    if (this.observers.hasOwnProperty(attribute)) {
      return true;
    } else {
      return false;
    }
  }
};
