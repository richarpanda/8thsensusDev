const key = webConfig.key;

var dataTable = null;
let tAccountLicenses;
let dataSet = null;
let usrid = null;
let userDetailString = null;
var editUser = false;
var userData = [];
var ctx2 = null;
var chart = null;
var customerId = null;
var machineName = null;
var userId = null;
var hr = null;

toastr.options = {
   "closeButton": true,
   "progressBar": true,
   "timeOut": "2000",
   "extendedTimeOut": "1000"
};

Date.prototype.addDays = function (days) {
   var date = new Date(this.valueOf());
   date.setDate(date.getDate() + days);
   return date;
};

init();

async function init() {
   document.getElementById("loader").classList.add("show-loader");

   const querystring = window.location.search;
   const params = new URLSearchParams(querystring);
   usrid = params.get("usrid");

   
   let res = JSON.parse(await getMessage());
   let resa = JSON.parse(await getActionsAll());
   hr = JSON.parse(await getHumanResourceAll());


   document.getElementById("loader").classList.remove("show-loader");
   document.getElementById("loader").classList.add("hide-loader");
   
   let result = alasql(`
      SELECT
         CASE 
            WHEN NOT LEN(a.userId) >= 0 THEN r.userid
            ELSE a.userId
         END [userid],
         r.id,r.key, r.customerid, r.mac,r.remoteip,r.diagcode,r.version,r.machinename,r.devicelist,r.confidence,r.type,r.os,r.hardware,r.applications,r.perfcounters,r.localip,r.gps,r.utc,r.stamp
      FROM ? r
      LEFT JOIN ? a 
      ON r.machinename IN a.machineName`, [res, resa]);

      let machinestabString = "";
      let machinesTabContentString = "";
      
      let machines = alasql(
      `
      SELECT machinename
      FROM ?
      WHERE userid = '${usrid}' OR UPPER(userid) = '${usrid}'
      GROUP BY machinename
      `,
      [result]
      );
      
      console.table(machines);
   for (let i = 0; i < machines.length; i++) {
      let navId = `${machines[i].machinename}`;
      machineName = machines[i].machinename;

      machinestabString += `
         <a class="nav-item nav-link user-nav ${i == 0 ? "active" : ""}"
            id="nav-${navId + "-tab"}"
            data-toggle="tab"
            href="#nav-${navId}"
            role="tab"
            aria-controls="nav-${navId}"
            aria-selected="${i == 0 ? "true" : "false"}">

            <i class="fa fa-desktop"></i>
            <p>
               ${machines[i].machinename}
            </p>
         </a>`;

      machinesTabContentString += `
         <div class="tab-pane fade ${i == 0 ? "show active" : ""}"
            id="nav-${navId}"
            role="tabpanel"
            aria-labelledby="nav-${navId + "-tab"}">

            <div class="row mt-2 p-2">
               <div class="col-md-12">
                  <table id="machine-table" class="table table-sm table-mail">
                     <tbody>
                     ${getMachineData(navId, result)}
                     </tbody>
                  </table>
                  <div id="map-container" class="map-container animate__animated animate__pulse animate__faster hide-map">
                     <div id="map"></div>
                  </div>
               </div>
            </div>
         </div>`;
   }

   let data = alasql(`
      SELECT customerid, userid, devicelist, os, hardware, localip, applications, gps, anchorAddress ,firstName ,lastName ,key ,telephone, department
      FROM ?
      WHERE userid = '${usrid}' OR UPPER(userid) = '${usrid}'
      GROUP BY customerid, userid, devicelist, os, hardware, localip, applications, gps, anchorAddress ,firstName ,lastName ,key ,telephone, department
   `,[result]);

   userData = data[0];
   createUserDetail();

   $("#nav-tab").append(machinestabString);
   $("#nav-tabContent").append(machinesTabContentString);

   getproductivityData(result);
}

function createUserDetail(editUser = false) {
   customerId = userData.customerid;
   let hrData = alasql(`SELECT * FROM ? WHERE userId = '${usrid}' OR UPPER(userId) = '${usrid}'`, [hr])[0];

   $("#user-name").html(`
      <div class="userid-font">
         <img src="${hrData.anchorGPS.length < 10 ? 'img/Circle-icons-profile.svg' : hrData.anchorGPS}" alt="user-profile" class="grid-img" />
      </div>
      <h3>${hrData.userId}</h3>`);

   if (editUser) {
      userDetailString = `
         <thead class="edit-table">
            <tr>
               <td><b>Customer Id: </b>${userData.customerid}</td>
            </tr>
            <tr>
               <td class="form-inline pb-0">
                  <p class="mr-2"><b>User Id: </b></p>
                  <input type="text" id="inptUserId" class="form-control form-control-sm" value="${userData.userid}" />
               </td>
            </tr>
            <tr>
               <td class="form-inline pb-0">
                  <p class="mr-2"><b>First Name: </b></p>
                  <input type="text" id="inptFirstName" class="form-control form-control-sm" value="${hrData.firstName}" />
               </td>
            </tr>
            <tr>
               <td class="form-inline pb-0">
                  <p class="mr-2"><b>Last Name: </b></p>
                  <input type="text" id="inptLastName" class="form-control form-control-sm" value="${hrData.lastName}" />
               </td>
            </tr>
            <tr>
               <td class="form-inline pb-0">
                  <p class="mr-2"><b>Address: </b></p>
                  <input type="text" id="inptAnchorAddress" class="form-control form-control-sm" value="${hrData.anchorAddress}" />
               </td>
            </tr>
            <tr>
               <td class="form-inline pb-0">
                  <p class="mr-2"><b>Image Link: </b></p>
                  <input type="text" id="inptImageKey" class="form-control" value="${hrData.anchorGPS}" />
               </td>
            </tr>
            <tr>
               <td class="form-inline pb-0">
                  <p class="mr-2"><b>Department: </b></p>
                  <input type="text" id="inptDepartment" class="form-control" value="${hrData.department}" />
               </td>
            </tr>
         </thead>`;

      document.getElementById("edit-buttons").className = "";
   } else {
      userDetailString = `
         <thead>
            <tr>
               <td><b>Customer Id: </b>${userData.customerid}</td>
            </tr>
            <tr>
               <td><b>UserId: </b> ${userData.userid}</td>
            </tr>
            <tr>
               <td><b>First Name: </b> ${hrData.firstName}</td>
            </tr>
            <tr>
               <td><b>Last Name: </b> ${hrData.lastName}</td>
            </tr>
            <tr>
               <td><b>Address: </b> ${hrData.anchorAddress}</td>
            </tr>
            <tr>
               <td><b>Department: </b> ${hrData.department}</td>
            </tr>
         </thead>`;
      document.getElementById("edit-buttons").className = "hide";
   }

   $("#user-detail").html(userDetailString);
}

function showEdit() {
   editUser = !editUser;
   createUserDetail(editUser);
}

async function saveUserDetails() {
   userRequest = {
      actionType: "changeUserId",
      customerId: customerId,
      key: key,
      machineName: machineName,
      userId: document.getElementById("inptUserId").value,
      accessId: "000000",
      verified: "true",
   };

   document.getElementById("loader").classList.remove("show-loader");
   // await deleteLastUsers(userRequest);
   $.ajax({
      url: webConfig.dataLakeUrl + "/actions/save",
      headers: {
         "Content-Type": "application/json",
      },
      type: "POST",
      data: JSON.stringify(userRequest),
      success: function (result) {
         document.getElementById("loader").classList.add("hide-loader");
         updateUser();
      },
      error: function (err) {
         console.log("Error:");
         console.log(err);
      },
   });
}

async function updateUser() {
   let data = await alasql(`
      SELECT * FROM ? WHERE userId = '${usrid}' OR UPPER(userId) = '${usrid}'`, [hr])[0];
   
   let request = {
      anchorAddress: document.getElementById("inptAnchorAddress").value,
      anchorGPS: document.getElementById("inptImageKey").value,
      customerId: data.customerId,
      department: document.getElementById("inptDepartment").value,
      firstName: document.getElementById("inptFirstName").value,
      id: data.id,
      key: data.key,
      lastName: document.getElementById("inptLastName").value,
      role: data.role,
      telephone: data.telephone,
      userId: data.userId,
      utc: data.utc
   };

   document.getElementById("loader").classList.remove("show-loader");
   $.ajax({
      url: webConfig.dataLakeUrl + "/employee/update?id=" + request.id + "&key=" + encodeURIComponent(request.key),
      headers: {
         "Content-Type": "application/json",
      },
      type: "PUT",
      data: JSON.stringify(request),
      success: function (result) {
         document.getElementById("loader").classList.add("hide-loader");
         document.location.href = 'users.html?usrid=' + userRequest.userId;
      },
      error: function (err) {
         console.log("Error:");
         console.log(err);
      },
   });
}

async function deleteLastUsers(userRequest) {
   await $.ajax({
      url: webConfig.dataLakeUrl + "/actions/all",
      headers: {
         "Content-Type": "application/x-www-form-urlencoded",
      },
      type: "GET",
      dataType: "json",
      data: {},
      success: function (result) {
         let data = alasql(`
            SELECT  *
            FROM ?
            WHERE machineName = '${userRequest.machineName}'`,
            [result]
         );

         if (data.length > 0) {
            data.forEach(item => {
               $.ajax({
                  url: webConfig.dataLakeUrl + "/actions/delete?id=" + item.id + "&key=" + encodeURIComponent(key),
                  headers: {
                     "Content-Type": "application/x-www-form-urlencoded",
                  },
                  type: "DELETE",
                  dataType: "json",
                  data: {},
                  success: function (result) {
                     console.log(result);
                  },
                  error: function (err) {
                     console.log("Error:");
                     console.log(err);
                  },
               });
            });
         }
      },
      error: function (err) {
         console.log("Error:");
         console.log(err);
      },
   });
}

function getMachineData(machinename, result) {
   let data = alasql(
      `
      SELECT customerid, devicelist, os, hardware, localip, applications, gps, stamp
      FROM ?
      WHERE machinename = '${machinename}'
      GROUP BY customerid, devicelist, os, hardware, localip, applications, gps, stamp
      ORDER BY stamp DESC
      `,
      [result]
   );

   let tableString = `
      <tr>
         <td><b>Device List: </b> ${data[0].devicelist}</td>
      </tr>
      <tr>
         <td><b>OS: </b> ${data[0].os}</td>
      </tr>
      <tr>
         <td><b>Hardware: </b> ${data[0].hardware}</td>
      </tr>
      <tr>
         <td><b>Local IP: </b> ${data[0].localip}</td>
      </tr>
      <tr>
         <td><b>Last Update: </b> ${data[0].stamp}</td>
      </tr>
      `;

   createTabs(data, machinename);

   return tableString;
}

function createTabs(dataArr, machineName) {
   for (let i = 0; i < 4; i++) {
      let tabType = "";
      let tabString = "";
      let tabContentString = "";

      switch (i) {
         case 0:
            tabType = "Applications";
            break;
         case 1:
            tabType = "Browser_History";
            break;
         case 2:
            tabType = "Plugins";
            break;
         case 3:
            tabType = "Gps";
            break;
      }

      let navId = machineName + "-" + tabType;

      tabString += `
         <a class="nav-item nav-link user-nav ${i == 0 ? "active" : ""}"
            id="nav-${navId + "-tab"}"
            data-toggle="tab"
            href="#nav-${navId}"
            role="tab"
            aria-controls="nav-${navId}"
            aria-selected="${i == 0 ? "true" : "false"}">

            <p>
               ${tabType}
            </p>
         </a>
      `;

      tabContentString += `
         <div class="tab-pane fade ${i == 0 ? "show active" : ""}"
               id="nav-${navId}"
               role="tabpanel"
               aria-labelledby="nav-${navId + "-tab"}">

            <div class="row mt-2 p-2">
               <div class="col-md-12">
                  ${getContentData(dataArr, i)}
               </div>
            </div>

         </div>
      `;

      $("#nav-apps-tab").append(tabString);
      $("#nav-apps-tab-content").append(tabContentString);
   }
}

function getContentData(data, i) {
   let apps = [];

   switch (i) {
      case 0:
         let tableString = `<table class="table table-responsive table-hover">
               <thead>
                  <tr>
                     <th>Application Name </th>
                     <th>Last Used Date </th>
                     <th>Average </th>
                     <th>CPU </th>
                     <th>Memory </th>
                     <th>Status </th>
                  </tr>
               </thead>
               <tbody>`;

         data.forEach((element) => {
            element.applications = element.applications.replace("{", " ");
            element.applications = element.applications.replace("}", " ");

            let elementApps = (
               element.applications.split("|")[0] +
               element.applications.split("|")[1]
            ).split(",");
            elementApps.forEach((app) => {
               if (apps[0] == undefined) {
                  apps.push({
                     appName: app.trim(),
                     lastUsed: element.stamp,
                  });
               } else {
                  if (apps.find((x) => x.appName == app.trim()) == undefined) {
                     apps.push({
                        appName: app.trim(),
                        lastUsed: element.stamp,
                     });
                  }
               }
            });
         });

         var appssql = alasql(`SELECT * FROM ? ORDER BY appName`, [apps]);

         appssql.forEach((app) => {
            tableString += `
               <tr>
                  <td>${app.appName}</td>
                  <td>${app.lastUsed}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td>Normal</td>
               </tr>`;
         });

         tableString += `</tbody></table>`;

         return tableString;
      case 1:
      case 2:
         return "NO DATA";
         break;
      case 3:
         let gpsArr = [];
         let tableGpsString = `<table class="table table-responsive table-hover">
               <thead>
                  <tr>
                     <th>GPS: </th>
                     <th>Date: </th>
                  </tr>
               </thead>
               <tbody>`;

         data.forEach((element) => {
            if (gpsArr[0] == undefined) {
               gpsArr.push(element.gps);

               tableGpsString += `
                  <tr>
                     <td>${element.gps}</td>
                     <td>${element.stamp}</td>
                  </tr>`;
            } else {
               if (gpsArr.indexOf(element.gps) === -1) {
                  gpsArr.push(element.gps);

                  tableGpsString += `
                     <tr>
                        <td>${element.gps}</td>
                        <td>${element.stamp}</td>
                     </tr>`;
               }
            }
         });

         tableGpsString += `</tbody></table>`;

         return tableGpsString;
   }
}

function getproductivityData(result) {
   let timeInterval = ",SUBSTRING(stamp, 1, 10) [timeInterval]";
   let timeIntervalFormat = "SUBSTRING(timeInterval, 12,13) + ':00'";
   let slctUsersId = usrid;
   let arrLock = [];

   let dateFrom = moment().add(-7, "days").format("YYYY-MM-DDT00:00:00");

   let dates = [];

   for (let i = 0; i < 7; i++) {
      let dt = formatDate(new Date().addDays(-i)).toString();
      dates.push(dt.substring(0, 10));
   }

   let userData = alasql(
      `
      SELECT
         CASE
            WHEN diagcode IN ('D0001','D0002','D0006','D0014','D0011','D0010','D0013') THEN 1
            WHEN diagcode IN ('D0003','D0004','D0005','D0007','D0008','D0009','D0012','D0015') THEN 0
            ELSE  diagcode
         END [activeStatus]
         ,userid
         ,stamp [date]
         ${timeInterval}
      FROM ?
      WHERE stamp >= '${dateFrom}'
      AND userid = '${slctUsersId}' OR UPPER(userid) = '${usrid}'
      ORDER BY userid, stamp
   `,
      [result]
   );
   userData.forEach(function (d, idx) {
      d.rownum = idx;
   });

   for (let i = 0; i < userData.length; i++) {
      let actualData = userData[i];

      if (i > 0) {
         let nextData = userData[i + 1];
         if (
            nextData !== undefined &&
            (actualData.activeStatus != nextData.activeStatus ||
               actualData.userid != nextData.userid)
         ) {
            arrLock.push(nextData);
         }
      } else arrLock.push(actualData);
   }

   for (let i = 0; i < arrLock.length; i++) {
      let actualData = arrLock[i];

      if (i != arrLock.length - 1) {
         let nextData = arrLock[i + 1];
         if (
            actualData.userid == nextData.userid &&
            actualData.timeInterval.substring(0, 10) ==
            nextData.timeInterval.substring(0, 10)
         ) {
            if (actualData.activeStatus == 1) {
               // ACTIVE TIME
               arrLock[i].activeTime = Math.abs(
                  new Date(nextData.date) - new Date(actualData.date)
               );
               arrLock[i].inactiveTime = 0;
            } else {
               // INACTIVE TIME
               arrLock[i].activeTime = 0;
               arrLock[i].inactiveTime = Math.abs(
                  new Date(nextData.date) - new Date(actualData.date)
               );
            }
         }
      }
   }

   // console.table(arrLock);

   let activeInactiveDatabyUser = alasql(
      `
      SELECT userid, SUM(activeTime) activeMs, SUM(inactiveTime) inactiveMs
      FROM ?
      GROUP BY userid
      ORDER BY userid
   `,
      [arrLock]
   );

   activeInactiveDatabyUser.forEach((item) => {
      item.activeTime = msToTime(item.activeMs);
      item.inactiveTime = msToTime(item.inactiveMs);
   });

   createTable(activeInactiveDatabyUser);
   //console.table(activeInactiveDatabyUser);

   if (arrLock.length > 0) {
      let userId = arrLock[0].userid;

      for (let dt = 0; dt < dates.length; dt++) {
         arrLock.push({
            activeStatus: 1,
            activeTime: 0,
            date: dates[dt],
            inactiveTime: 0,
            rownum: 0,
            timeInterval: dates[dt],
            userid: userId,
         });
      }
   }
   //console.table(arrLock); // TIMES

   let activeInactiveData = alasql(
      `
      SELECT SUBSTRING(date, 1, 10) [date], SUM(activeTime) activeMs, SUM(inactiveTime) inactiveMs,
      SUBSTRING(timeInterval, 1,10) AS [timeInterval]
      FROM ?
      GROUP BY SUBSTRING(date, 1, 10), SUBSTRING(timeInterval, 1,10)
      ORDER BY [date], [timeInterval]
   `,
      [arrLock]
   );

   activeInactiveData.forEach((item) => {
      item.activeTime = msToTime(item.activeMs);
      item.inactiveTime = msToTime(item.inactiveMs);
   });

   //console.table(activeInactiveData); // FINAL RESULT

   createGraph(activeInactiveData);
}

function createTable(data) {
   if (dataTable !== null) dataTable.destroy();

   dataTable = $("#example").DataTable({
      data: data,
      columns: [
         { data: "userid" },
         { data: "activeTime" },
         { data: "inactiveTime" },
      ],
      order: [0, "asc"],
      rowCallback: function (row, data, index) {
         $(row)
            .find("td:eq(0)")
            .html(
               `<a href="users.html?usrid=${data["userid"]}">${data["userid"]}</a>`
            );
      },
      select: false,
      pageLength: 10,
      responsive: true,
      dom: "",
      retrieve: false,
      searching: false,
   });
}

function createGraph(graphData) {
   var barData = {
      labels: getGraphLabels(graphData),
      datasets: [
         {
            label: "Lock",
            backgroundColor: "rgba(26,179,148,0.5)",
            borderColor: "rgba(26,179,148,0.7)",
            pointBackgroundColor: "rgba(26,179,148,1)",
            pointBorderColor: "#fff",
            data: getGraphUnlockValues(graphData),
            stack: "Stack 0",
         },
      ],
   };

   var barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
         yAxes: [
            {
               ticks: {
                  beginAtZero: true,
                  callback: function (label, index, labels) {
                     return msToTimeHr(label);
                  },
               },
               scaleLabel: {
                  display: true,
                  labelString: "Total Hours",
               },
            },
         ],
         xAxes: [
            {
               scaleLabel: {
                  display: true,
                  labelString: "Days / Hours",
               },
               stacked: true,
            },
         ],
      },
      tooltips: {
         callbacks: {
            label: function (tooltipItem) {
               return msToTime(tooltipItem.yLabel);
            },
         },
      },
   };

   if (ctx2 !== null) ctx = null;
   if (chart !== null) chart.destroy();

   ctx2 = document.getElementById("userBarChart").getContext("2d");
   chart = new Chart(ctx2, { type: "bar", data: barData, options: barOptions });
}

function getGraphLabels(data) {
   let result = [];
   data.forEach((item) => {
      result.push(item.timeInterval);
   });
   return result;
}

function getGraphLockValues(data) {
   let result = [];
   data.forEach((item) => {
      result.push(item.inactiveMs);
   });
   return result;
}

function getGraphUnlockValues(data) {
   let result = [];
   data.forEach((item) => {
      result.push(item.activeMs);
   });
   return result;
}

function formatDate(utcDate) {
   let d = new Date(utcDate);
   let month =
      (d.getMonth() + 1).toString().length == 1
         ? "0" + (d.getMonth() + 1)
         : d.getMonth() + 1;
   let day =
      d.getDate().toString().length == 1 ? "0" + d.getDate() : d.getDate();
   let hour =
      d.getHours().toString().length == 1 ? "0" + d.getHours() : d.getHours();
   let min =
      d.getMinutes().toString().length == 1
         ? "0" + d.getMinutes()
         : d.getMinutes();
   let sec =
      d.getSeconds().toString().length == 1
         ? "0" + d.getSeconds()
         : d.getSeconds();
   return (
      d.getFullYear() +
      "-" +
      month +
      "-" +
      day +
      " " +
      hour +
      ":" +
      min +
      ":" +
      sec
   );
}

function msToTime(s) {
   function pad(n, z) {
      z = z || 2;
      return ("00" + n).slice(-z);
   }

   var ms = s % 1000;
   s = (s - ms) / 1000;
   var secs = s % 60;
   s = (s - secs) / 60;
   var mins = s % 60;
   var hrs = (s - mins) / 60;

   return pad(hrs) + ":" + pad(mins);
}

function msToTimeHr(s) {
   function pad(n, z) {
      z = z || 2;
      return ("00" + n).slice(-z);
   }

   var ms = s % 1000;
   s = (s - ms) / 1000;
   var secs = s % 60;
   s = (s - secs) / 60;
   var mins = s % 60;
   var hrs = (s - mins) / 60;

   return pad(hrs) + ":00";
}

function msToDateTime(s) {
   function pad(n, z) {
      z = z || 2;
      return ("00" + n).slice(-z);
   }

   var ms = s % 1000;
   s = (s - ms) / 1000;
   var secs = s % 60;
   s = (s - secs) / 60;
   var mins = s % 60;
   var hrs = (s - mins) / 60;

   let dateNow = new Date();
   return new Date(
      dateNow.getFullYear(),
      dateNow.getMonth(),
      dateNow.getDate(),
      pad(hrs),
      pad(mins),
      pad(secs),
      0
   );
}

function initMap(gps) {
   if (gps !== undefined) {
      let gpsArr = gps.split(",");
      let lat = parseFloat(gpsArr[0].trim());
      let long = parseFloat(gpsArr[1].trim());
      const uluru = { lat: lat, lng: long };
      const map = new google.maps.Map(document.getElementById("map"), {
         zoom: 8,
         center: uluru,
      });
      const marker = new google.maps.Marker({
         position: uluru,
         map: map,
      });

      var element = document.getElementById("map-container");
      element.classList.remove("hide-map");
      element.classList.add("show-map");
   }
}

async function getAllDocs() {
   let finalArr = null;
   let result = null;
   let docLen = 0;
   let offset = 0;

   do {
      result = await getDocs(offset);

      docLen += result.actions.length;
      if (docLen > 0) {
         finalArr = offset == 0 ? result.actions : finalArr.concat(result.actions);
         docLen += 1;
         offset = docLen;
      }

   } while (result.actions.length > 0);

   return (finalArr);
}

async function getDocs(offset) {
   let result = null;

   await getDocsOffset(offset).then((res) => {
      result = JSON.parse(res);
   });

   return result;
}