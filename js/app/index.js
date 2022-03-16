const dataLakeUrl = webConfig.dataLakeUrl;

let tAccountLicenses;
var ctx2 = null;
var chart = null;
let dataSet = null;

Date.prototype.addDays = function (days) {
   var date = new Date(this.valueOf());
   date.setDate(date.getDate() + days);
   return date;
}

document.getElementById("loader").classList.add("show-loader");
$.ajax({
   url: dataLakeUrl + "/message",
   headers: {
      "Content-Type": "application/x-www-form-urlencoded",
   },
   type: "GET" /* or type:"GET" or type:"PUT" */,
   dataType: "json",
   data: {},
   success: function (res) {
      $.ajax({
         url: dataLakeUrl + "/actions/all",
         headers: {
            "Content-Type": "application/x-www-form-urlencoded",
         },
         type: "GET",
         dataType: "json",
         data: {},
         success: function (resa) {
            let result = alasql(`
               SELECT 
                  CASE 
                     WHEN NOT LEN(a.userId) >= 0 THEN r.userid
                     ELSE a.userId
                  END [userid],
                  r.id,r.key, r.customerid, r.mac,r.remoteip,r.diagcode,r.version,r.machinename,r.devicelist,r.confidence,r.type,r.os,r.hardware,r.applications,r.perfcounters,r.localip,r.gps,r.utc,r.stamp
               FROM ? r
               LEFT JOIN ? a 
               ON r.machinename IN a.machineName
            `, [res, resa]);

            document.getElementById("loader").classList.remove("show-loader");
            document.getElementById("loader").classList.add("hide-loader");
            startOfWeek = "2021-04-05T01:35:35.648732Z";
            //var productData = alasql("SELECT diagcode, utc FROM ? WHERE userid='Kingpin' and utc > '" + startOfWeek + "' order by utc",[result]);

            var productData = alasql(`SELECT COUNT(diagcode) FROM ? order by utc`, [
               result,
            ]);

            var start = new Date();
            var end = new Date();

            //var start = new Date();
            //start.setDate(start.getDate() - 2);

            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            var hourBefore;
            var hourAfter;
            var accountLicenses;
            var accountDevices;
            var accountIntrusions;
            var accountAlerts;

            var licensesArray = [];
            var devicesArray = [];
            var IntrusionsArray = [];
            var alertsArray = [];
            var accountDevicesTest = [];

            statCount();

            for (i = 0; i < 24; i++) {
               hourBefore = moment(start.setHours(start.getHours() + i)).format();
               hourAfter = moment(end.setHours(end.getHours() + i + 1)).format();

               accountLicenses = alasql(
                  "SELECT COUNT(DISTINCT userid) licenses FROM ? WHERE utc >= '" +
                  hourBefore +
                  "' and utc < '" +
                  hourAfter +
                  "' order by utc",
                  [result]
               );
               accountDevices = alasql(
                  "SELECT COUNT(DISTINCT userid) devices FROM ? WHERE utc >= '" +
                  hourBefore +
                  "' and utc < '" +
                  hourAfter +
                  "' order by utc",
                  [result]
               );
               accountIntrusions = alasql(
                  "SELECT COUNT(DISTINCT userid) intrusions FROM ? WHERE utc >= '" +
                  hourBefore +
                  "' and utc < '" +
                  hourAfter +
                  "' and (diagcode = 'D0011' or diagcode = 'D0012') order by utc",
                  [result]
               );
               accountAlerts = alasql(
                  "SELECT COUNT(userid) alerts FROM ? WHERE utc >= '" +
                  hourBefore +
                  "' and utc < '" +
                  hourAfter +
                  "' order by utc",
                  [result]
               );

               accountDevicesTest = alasql(
                  "SELECT utc FROM ? WHERE utc >= '" +
                  hourBefore +
                  "' and utc < '" +
                  hourAfter +
                  "' order by utc",
                  [result]
               );

               licensesArray.push(accountLicenses[0].licenses);
               devicesArray.push(accountDevices[0].devices);
               IntrusionsArray.push(accountIntrusions[0].intrusions);
               alertsArray.push(accountAlerts[0].alerts);

               start.setHours(0, 0, 0, 0);
               end.setHours(0, 0, 0, 0);
            }

            function statCount() {
               const today = moment();
               const hourBefore = moment(today.startOf("day")).format();
               const hourAfter = moment(today.endOf("day")).format();

               const yesterday = moment();

               const yesterdayHourBefore = moment(yesterday.startOf("day")).format();
               const yesterdayHourAfter = moment(yesterday.endOf("day")).format();

               accountLicenses = alasql(
                  "SELECT COUNT(distinct UPPER(userid)) as licenses FROM ?",
                  [result]
               );
               accountDevices = alasql("SELECT COUNT(DISTINCT userid) devices FROM ? ", [
                  result,
               ]);
               accountIntrusions = alasql(
                  "SELECT COUNT(DISTINCT userid) intrusions FROM ? WHERE utc >= '" +
                  hourBefore +
                  "' and utc < '" +
                  hourAfter +
                  "' and (diagcode = 'D0011' or diagcode = 'D0012') order by utc",
                  [result]
               );
               accountAlerts = alasql(
                  "SELECT COUNT(userid) alerts FROM ? WHERE utc >= '" +
                  hourBefore +
                  "' and utc < '" +
                  hourAfter +
                  "' order by utc",
                  [result]
               );

               var countLicenses = accountLicenses[0].licenses;
               var countDevices = accountDevices[0].devices;
               var countIntrusions = accountIntrusions[0].intrusions;
               var countAlerts = accountAlerts[0].alerts;

               $("#licUser").html(countLicenses);
               tAccountLicenses = countLicenses;
               $("#activeUsers_24hours").html(countLicenses);
               /*graph*/
               /*Devices*/
               let devicesAction = countLicenses;
               var doughnutData = {
                  labels: ["Active", "Inactive"],
                  datasets: [
                     {
                        data: [devicesAction, 0],
                        backgroundColor: ["#a3e1d4", "#dedede"],
                     },
                  ],
               };
               var doughnutOptions = {
                  legend: { display: true },
                  responsive: true,
                  title: {
                     display: true,
                     text: "Total Licenses:" + countLicenses,
                     verticalAlign: "center",
                     textAlign: "center",
                     textBaseline: "middle",
                  },
                  onClick: (evt, item) => {
                     window.location.href = "admin/userMachineManagement.html";
                  },
               };
               var ctx4 = document.getElementById("doughnutChart").getContext("2d");
               new Chart(ctx4, {
                  type: "doughnut",
                  data: doughnutData,
                  options: doughnutOptions,
               });

               /******************************* Alerts and Intrusions *******************************/
               getIntrusionGraphData(result);
               /*************************************************************************************/
               $("#devices").html(countDevices);
               $("#activeDevices_24hours").html(countDevices);

               $("#intrusions").html(countIntrusions);
               $("#intrusions_24hours").html(countIntrusions);

               $("#alerts").html(countAlerts);
            }

            var matrix = result.length;
            //alert(result[0].userid);

            var countItem = 0;

            var uniqueNames = [];
            var currentDT = new Date();
            var subHour = 0;
            var timeNow = new Date();
            var stamTime;
            var sessionTime;
            var today = new Date();
            var activeUser = 0;
            var activeUserJson = [];
            var dataMatch = false;
            var htmlString = "";
            var loactionInfo = "";

            for (i = 0; i < result.length; i++) {
               if (result[i].length > 1) {
                  stamTime = new Date(result[i].utc);

                  oneHoursBefore = new Date(today.getTime());
                  oneHoursAfter = new Date(today.getTime() - 1000 * 60 * 60);

                  for (x = 0; x < result.length; x++) {
                     sessionTime = result[x].utc;
                     if (
                        Date.parse(oneHoursBefore) > Date.parse(sessionTime) &&
                        Date.parse(oneHoursAfter) < Date.parse(sessionTime)
                     ) {
                        activeUser = activeUser + 1;
                        dataMatch = true;
                     }
                  }

                  if (dataMatch) {
                     activeUserJson.push([oneHoursBefore, activeUser]);
                  }

                  today = oneHoursAfter;
                  activeUser = 0;
                  dataMatch = false;
               }
            }

            for (y = 0; y < result.length; y++) {
               //if (result[y].length > 1) {
               if (uniqueNames.indexOf(result[y].userid) === -1) {
                  uniqueNames.push(result[y].userid);
               }
               //}
            }

            //Licensed users
            for (y = 0; y < uniqueNames.length; y++) {
               //if (result[y].length > 1) {
               countItem = 1 + countItem;
               //}
            }

            //$('#licUser').html(countItem);
            //$('#activeUsers_24hours').html(countItem);

            //Devices
            countItem = 0;
            for (y = 0; y < uniqueNames.length; y++) {
               //alert(uniqueNames[i]);
               countItem = 1 + countItem;
            }

            //$('#devices').html(countItem);
            //$('#activeDevices_24hours').html(countItem);

            //Intrusions
            countItem = 0;
            $.each(result, function (i, v) {
               if (v.diagcode == "D0011" || v.diagcode == "D0012") {
                  countItem = 1 + countItem;
               }
            });

            //$('#intrusions').html(countItem);
            //$('#intrusions_24hours').html(countItem);

            //Alerts
            countItem = 0;
            $.each(result, function (i, v) {
               //if ((v.diagcode == 'D0003') || (v.diagcode == 'D0004') || (v.diagcode == 'D0005') || (v.diagcode == 'D0013')) {
               countItem = 1 + countItem;
               //}
            });

            //$('#alerts').html(countItem);

            /** LAST 24 HOURS INSTRUSION INSIGHTS **/
            let d = new Date();
            let todayDateStr = `${d.getFullYear()}-${d.getMonth().toString().length == 1 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1)}-${d.getDate().toString().length == 1 ? "0" + (d.getDate() - 1) : (d.getDate() - 1)}`;

            let last24Result = alasql(`
               SELECT gps, utc, userid, diagcode FROM ? 
               WHERE utc > '${todayDateStr}'
               ORDER BY utc DESC
            `, [result]);

            for (i = 0; i < last24Result.length; i++) {
               var gpsNumbers = last24Result[i].gps;
               var longlatArray = last24Result[i].gps.split(",");
               var timeStamp = last24Result[i].utc;
               var userName = last24Result[i].userid;
               var diagcode = last24Result[i].diagcode;
               var htmlString_1 = "";
               var htmlString_2 = "";
               var data = "";

               getCodeData(longlatArray, userName, formatDate(timeStamp), diagcode, i);
            }

            function getCode(code) {
               var codeDiscription = "";
               var codeJson = [
                  {
                     D0001:
                        "Screen Unlocked | Initial Login after reboot | Confidence 1:5,000,000",
                     D0002:
                        "Screen Unlocked | Zero Touch Unlocked authorized user |  1:5,000,000",
                     D0003:
                        "Screen Locked 0 | Zero Touch Locked no user present | Confidence 1:5,000,000",
                     D0004:
                        "Screen Locked 2 | Manual Lock Initiated by authorized user |  1:5,000,000",
                     D0005:
                        "Screen Locked 1| Lock without Camera | Confidence 1:5,000,000",
                     D0006:
                        "Screen Unlocked | Authorized user certified | Confidence 1:25,000,000",
                     D0007:
                        "Screen Locked 2 | Manual Lock Initiated by authorized user | Manual Process",
                     D0008:
                        "Screen Unlocked | Unauthorized user(s) presented |  Confidence 1:5,000,000",
                     D0009:
                        "Screen Locked 1 | Unauthorized user(s) presented  | Confidence 1:5,000,000",
                     D0010: "Screen Unlocked | Authorized user(s) presented | 1:5,000,000",
                     D0011:
                        "Screen Unlocked | Unauthorized user(s) presented | Confidence 1:100,000",
                     D0012:
                        "Screen Locked 3 | Power Savings Lock Initiated | System Process",
                     D0013: "Screen Unlocked | 8th Sensus EVE Stopped | Error",
                     D0014:
                        "Screen Unlocked | Video Conference in progress| Confidence 1:5,000,000",
                     D0015:
                        "Screen Locked 1 | Over the Shoulder unauthorized user(s) presented |  > 1",
                  },
               ];

               $.each(codeJson[0], function (key, value) {
                  if (code == key) {
                     codeDiscription = value;
                  }
               });
               return codeDiscription;
            }

            function getCodeData(longlatArray, userName, timeStamp, diagcode, count) {
               var state = "";
               var town = "";
               var postcode = "";

               if (gpsNumbers !== "") {
                  state = data.principalSubdivision;
                  town = data.locality;
                  postcode = data.postcode;
               } else {
                  state = data.location.isoPrincipalSubdivision;
                  town = data.location.localityName;
                  postcode = data.location.postcode;
               }

               var address = town + " " + postcode + ", " + state;

               var geoCodeInfo = getCode(diagcode);

               var url = "../activity_logs/devices/?usrid=" + userName;

               htmlString_1 = htmlString_1 + "<tr>";
               htmlString_1 = htmlString_1 + "<td><i class='fa fa-clock-o'></i> " + timeStamp + "</td>";
               htmlString_1 = htmlString_1 + "<td><a href='users.html?usrid=" + userName + "'>" + userName + "</td>";
               /*htmlString_1 = htmlString_1 + "<td>" + address + "</td>";*/

               htmlString_1 =
                  htmlString_1 +
                  "<td class='text-navy'> <i class='fa fa-level-up'></i>" +
                  geoCodeInfo +
                  "</td>";
               htmlString_1 = htmlString_1 + "</tr>";

               $("#intrusion-insights tbody").append(htmlString_1);
               htmlString_1 = "";

               if (count < 4) {
                  htmlString_2 = htmlString_2 + "<div class='feed-element'>";
                  htmlString_2 = htmlString_2 + "<div>";
                  htmlString_2 =
                     htmlString_2 +
                     "<small class='float-right text-navy'>1m ago</small>";
                  htmlString_2 = htmlString_2 + "<strong>" + address + "</strong>";
                  htmlString_2 = htmlString_2 + "<div>" + geoCodeInfo + "</div>";
                  htmlString_2 =
                     htmlString_2 +
                     "<small class='text-muted'>" +
                     timeStamp +
                     "</small>";
                  htmlString_2 = htmlString_2 + "</div>";
                  htmlString_2 = htmlString_2 + "</div>";

                  $("#geo-loc-hotspots").html(htmlString_2);
               }
            }
         },
         error: function (err) {
            console.log("Error:");
            console.log(err);
         },
      });
   },
   error: function (xhr, status, error) {
      //alert(error);
   },
});

function getIntrusionGraphData(resultData) {
   let dateFrom = formatDate(new Date().addDays(-7)).toString().replace(" ", "T");
   let arrLock = [];
   let dates = [];

   for (let i = 0; i < 7; i++) {
      let dt = formatDate(new Date().addDays(-i)).toString();
      dates.push(dt.substring(0, 10));
   }

   let userData = alasql(`
      SELECT
         CASE 
            WHEN diagcode IN ('D0003','D0004','D0007','D0008','D0015','D0012','D0009') THEN 1
            WHEN diagcode IN ('D0001','D0002','D0014','D0006','D0011','D0005','D0010','D0013') THEN 0
            ELSE  diagcode
         END [activeStatus]
         ,userid
         ,utc [date]
         ,SUBSTRING(stamp, 1, 10) [timeInterval]
      FROM ? 
      WHERE utc >= '${dateFrom}'
      ORDER BY userid, utc
   `, [resultData]);
   userData.forEach(function (d, idx) { d.rownum = idx });

   // console.table(userData);

   for (let i = 0; i < userData.length; i++) {
      let actualData = userData[i];

      if (i > 0) {
         let nextData = userData[i + 1];
         if (nextData !== undefined && (actualData.activeStatus != nextData.activeStatus || actualData.userid != nextData.userid)) {
            arrLock.push(nextData);
         }
      }
      else
         arrLock.push(actualData);
   }

   for (let i = 0; i < arrLock.length; i++) {
      let actualData = arrLock[i];

      if (i != arrLock.length - 1) {
         let nextData = arrLock[i + 1];
         if (actualData.userid == nextData.userid && actualData.timeInterval.substring(0, 10) == nextData.timeInterval.substring(0, 10)) {
            if (actualData.activeStatus == 1) { // LOCK TIME
               arrLock[i].activeTime = Math.abs(new Date(nextData.date) - new Date(actualData.date));
               arrLock[i].inactiveTime = 0;
            }
            else { // UNLOCK TIME
               arrLock[i].activeTime = 0
               arrLock[i].inactiveTime = Math.abs(new Date(nextData.date) - new Date(actualData.date));
            }
         }
      }
   }

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
            userid: userId
         });
      }
   }

   // console.table(arrLock); // TIMES

   let activeInactiveData = alasql(`
      SELECT SUBSTRING(date, 1, 10) [date], SUM(activeTime) activeMs, SUM(inactiveTime) inactiveMs,
         SUBSTRING(timeInterval, 1,10) AS [timeInterval]
      FROM ? 
      GROUP BY SUBSTRING(date, 1, 10), SUBSTRING(timeInterval, 1,10)
      ORDER BY [date], [timeInterval]
   `, [arrLock])

   activeInactiveData.forEach(item => {
      item.activeTime = msToTime(item.activeMs);
      item.inactiveTime = msToTime(item.inactiveMs);
   });

   createGraph(activeInactiveData);
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
         {
            label: "Unlocked",
            backgroundColor: "rgba(220, 220, 220, 0.5)",
            pointBorderColor: "#fff",
            data: getGraphLockValues(graphData),
            stack: "Stack 1",
         },
      ]
   };

   var barOptions = {
      responsive: true,
      scales: {
         yAxes: [
            {
               ticks: {
                  beginAtZero: true,
                  callback: function (label, index, labels) {
                     return msToTimeHr(label);
                  }
               }
            }
         ],
         xAxes: [{ stacked: true }],
      },
      tooltips: {
         callbacks: {
            label: function (tooltipItem) {
               return msToTime(tooltipItem.yLabel);
            }
         }
      },
   };

   if (ctx2 !== null)
      ctx = null;
   if (chart !== null)
      chart.destroy();

   ctx2 = document.getElementById("lineChart").getContext("2d");
   chart = new Chart(ctx2, { type: "bar", data: barData, options: barOptions });
}

function getGraphLabels(data) {
   let result = [];
   data.forEach(item => {
      result.push(item.timeInterval);
   });
   return result;
}

function getGraphLockValues(data) {
   let result = [];
   data.forEach(item => {
      result.push(item.inactiveMs);
   });
   return result;
}

function getGraphUnlockValues(data) {
   let result = [];
   data.forEach(item => {
      result.push(item.activeMs);
   });
   return result;
}

function formatDate(utcDate) {
   let d = new Date(utcDate);
   let month =
      (d.getMonth() + 1).toString().length == 1 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
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
      return ('00' + n).slice(-z);
   }

   var ms = s % 1000;
   s = (s - ms) / 1000;
   var secs = s % 60;
   s = (s - secs) / 60;
   var mins = s % 60;
   var hrs = (s - mins) / 60;

   return pad(hrs) + ':' + pad(mins)
}

function msToTimeHr(s) {
   function pad(n, z) {
      z = z || 2;
      return ('00' + n).slice(-z);
   }

   var ms = s % 1000;
   s = (s - ms) / 1000;
   var secs = s % 60;
   s = (s - secs) / 60;
   var mins = s % 60;
   var hrs = (s - mins) / 60;

   return pad(hrs) + ':00'
}

function msToDateTime(s) {
   function pad(n, z) {
      z = z || 2;
      return ('00' + n).slice(-z);
   }

   var ms = s % 1000;
   s = (s - ms) / 1000;
   var secs = s % 60;
   s = (s - secs) / 60;
   var mins = s % 60;
   var hrs = (s - mins) / 60;

   let dateNow = new Date();
   return new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate(), pad(hrs), pad(mins), pad(secs), 0);
}

function myFunction(url) {
   $(location).attr("href", url);
}
/*******************************************************************************************************/
