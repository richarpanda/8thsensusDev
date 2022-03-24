let tAccountLicenses;
var ctx2 = null;
var chart = null;
let dataSet = null;
var res = null;
var resa = null;
var resAll = null;

Date.prototype.addDays = function (days) {
   var date = new Date(this.valueOf());
   date.setDate(date.getDate() + days);
   return date;
};

init();

async function init() {
   document.getElementById("loader").classList.add("show-loader");

   res = JSON.parse(await getMessage());
   resa = JSON.parse(await getActionsAll());

   await processData(0);
}

async function processData(iteration) {
   if (iteration > 0) {
      document.getElementById("mini-loader").classList.remove("hide-loader");
      document.getElementById("mini-loader").classList.add("show-loader");
   }

   let result = alasql(
      `
      SELECT
         CASE
            WHEN NOT LEN(a.userId) >= 0 THEN r.userid
            ELSE a.userId
         END [userid],
         r.id,r.key, r.customerid, r.mac,r.remoteip,r.diagcode,r.version,r.machinename,r.devicelist,r.confidence,r.type,r.os,r.hardware,r.applications,r.perfcounters,r.localip,r.gps,r.utc,r.stamp, r.version
      FROM ? r
      LEFT JOIN ? a
      ON r.machinename IN a.machineName`,
      [res, resa]
   );

   var productData = alasql(`SELECT COUNT(diagcode) FROM ? order by utc`, [
      result,
   ]);

   var start = new Date();
   var end = new Date();

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

   var stamTime;
   var sessionTime;
   var today = new Date();
   var activeUser = 0;
   var activeUserJson = [];
   var dataMatch = false;

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

   /** LAST 24 HOURS INSTRUSION INSIGHTS **/
   let d = new Date();
   let todayDateStr = `${d.getFullYear()}-${d.getMonth().toString().length == 1
      ? "0" + (d.getMonth() + 1)
      : d.getMonth() + 1
      }-${d.getDate().toString().length == 1
         ? "0" + (d.getDate() - 1)
         : d.getDate() - 1
      }`;

   let last24Result = alasql(
      `
   SELECT gps, utc, userid, diagcode, version FROM ?
   WHERE utc > '${todayDateStr}'
   ORDER BY utc DESC
`,
      [result]
   );

   for (i = 0; i < last24Result.length; i++) {
      fillTable(last24Result[i]); //longlatArray, userName, formatDate(timeStamp), diagcode, i);
   }

   document.getElementById("loader").classList.add("hide-loader");

   if (iteration > 0) {
      document.getElementById("mini-loader").classList.remove("show-loader");
      document.getElementById("mini-loader").classList.add("hide-loader");
   }

   if (iteration == 0) {
      resAll = await getAllDocs();
      res = res.concat(resAll);
      processData(1);

      let hr = JSON.parse(await getHumanResourceAll());
      insertHR(hr, res);
   }
}

function fillTable(tableData) {
   let htmlString_1 = "";
   let geoCodeInfo = getCode(tableData.diagcode);

   htmlString_1 += "<tr>";
   htmlString_1 +=
      "<td><i class='fa fa-clock-o'></i> " +
      formatDate(tableData.utc) +
      "</td>";
   htmlString_1 +=
      "<td><a href='users.html?usrid=" +
      tableData.userid +
      "'>" +
      tableData.userid +
      "</td>";

   htmlString_1 +=
      "<td class='text-navy'> <i class='fa fa-level-up'></i>" +
      geoCodeInfo +
      "</td>";
   htmlString_1 += "<td>" + tableData.version + "</td>";
   htmlString_1 += "</tr>";

   $("#intrusion-insights tbody").append(htmlString_1);
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
         D0005: "Screen Locked 1| Lock without Camera | Confidence 1:5,000,000",
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

function getIntrusionGraphData(resultData) {
   let dateFrom = formatDate(new Date().addDays(-7))
      .toString()
      .replace(" ", "T");
   let arrLock = [];
   let dates = [];

   for (let i = 0; i < 7; i++) {
      let dt = formatDate(new Date().addDays(-i)).toString();
      dates.push(dt.substring(0, 10));
   }

   let userData = alasql(
      `
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
   `,
      [resultData]
   );
   userData.forEach(function (d, idx) {
      d.rownum = idx;
   });

   // console.table(userData);

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
               // LOCK TIME
               arrLock[i].activeTime = Math.abs(
                  new Date(nextData.date) - new Date(actualData.date)
               );
               arrLock[i].inactiveTime = 0;
            } else {
               // UNLOCK TIME
               arrLock[i].activeTime = 0;
               arrLock[i].inactiveTime = Math.abs(
                  new Date(nextData.date) - new Date(actualData.date)
               );
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
            userid: userId,
         });
      }
   }

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
      ],
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
                  },
               },
            },
         ],
         xAxes: [{ stacked: true }],
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

   ctx2 = document.getElementById("lineChart").getContext("2d");
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

function myFunction(url) {
   $(location).attr("href", url);
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

function insertHR(hr, res) {
   console.table(hr);
   let usersFilter = alasql(`
      SELECT r.userid,
      CASE
         WHEN LEN(hr.userId) >= 0 THEN hr.userId
         ELSE 'NULL'
      END [hrUserId],
      r.customerid, r.version as role
      FROM ? r
      LEFT JOIN ? hr 
      ON r.userid = hr.userId
      GROUP BY r.userid,CASE WHEN LEN(hr.userId) >= 0 THEN hr.userId ELSE 'NULL' END, r.customerid, r.version
   `, [res, hr]);

   // console.table(usersFilter);

   let insertUsers = alasql(`
      SELECT *
      FROM ? 
      WHERE hrUserId = 'NULL'
   `, [usersFilter]);

   // console.table(insertUsers);
   insertUsers.forEach(item => {
      saveHrUser(item);
   });
}

function saveHrUser(item) {
   $.ajax({
      url: dataLakeUrl + "/employee/save",
      headers: {
         "Content-Type": "application/json",
      },
      type: "POST",
      data: JSON.stringify({
         anchorAddress: "-1",
         anchorGPS: "-1",
         customerId: item.customerid,
         department: "-1",
         firstName: "-1",
         key: webConfig.key,
         lastName: "-1",
         role: item.role,
         telephone: "-1",
         userId: item.userid,
      }),
      success: function (res) {
         console.log(res);
      },
      error: function (err) {
         console.log("Error:");
         console.log(err);
      },
   });
}

