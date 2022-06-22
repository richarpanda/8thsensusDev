var dataLakeUrl = webConfig.dataLakeUrl;

function getMessage() {
   return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
         resolve(this.responseText);
      };
      xhr.onerror = reject;
      xhr.open("GET", dataLakeUrl + "/message");
      xhr.send();
   });
}

function getHumanResourceAll() {
   return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
         resolve(this.responseText);
      };
      xhr.onerror = reject;
      xhr.open("GET", dataLakeUrl + "/employee/all");
      xhr.send();
   });
}

function getDocsOffset(offset) {
   return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
         resolve(this.responseText);
      };
      xhr.onerror = reject;
      xhr.open("GET", dataLakeUrl + "/message/getDocs?offset=" + offset);
      xhr.send();
   });
}

function getActionsAll() {
   return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
         resolve(this.responseText);
      };
      xhr.onerror = reject;
      xhr.open("GET", dataLakeUrl + "/actions/all");
      xhr.send();
   });
}

function getUserPresentTime(requestObj) {
   return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
         resolve(this.responseText);
      };
      xhr.onerror = reject;
      xhr.open("GET", dataLakeUrl + "/message/userPresentTime?machineName=" + requestObj.machineName  + 
         "&startTime=" + requestObj.dateFrom + "&endTime=" + requestObj.dateTo );
      xhr.send();
   });
}

function getDistinctValues(timeObj) {
   return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
         resolve(this.responseText);
      };
      xhr.onerror = reject;
      xhr.open("GET", dataLakeUrl + "/message/distinctValues?customerid=" + webConfig.customerFilter + "&startTime=" + timeObj.dateFrom + "&endTime=" + timeObj.dateTo);
      xhr.send();
   });
}