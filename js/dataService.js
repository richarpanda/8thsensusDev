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