var dataTable = null;
let tAccountLicenses;
let dataSet = null;
let usrid = null;
var ctx2 = null;
var chart = null;

Date.prototype.addDays = function (days) {
   var date = new Date(this.valueOf());
   date.setDate(date.getDate() + days);
   return date;
}

document.getElementById("loader").classList.add("show-loader");
$.ajax({
   url: "https://dashboard.8thsensus.com:8080/message",
   headers: {
      "Content-Type": "application/x-www-form-urlencoded",
   },
   type: "GET" /* or type:"GET" or type:"PUT" */,
   dataType: "json",
   data: {},
   success: function (result) {
      document.getElementById("loader").classList.remove("show-loader");
      document.getElementById("loader").classList.add("hide-loader");

      const querystring = window.location.search;
      const params = new URLSearchParams(querystring);
      usrid = params.get('usrid');

      $("#userName").html(`<b>User</b>: ${usrid}`);

      let tableString = "";
      let machines = alasql(`
         SELECT machinename
         FROM ? 
         WHERE userid = '${usrid}'
         GROUP BY machinename
      `, [result]);

      tableString += `<tr><td class='table-list-items'><b>Machines Names: </b><br/><br />`;

      machines.forEach(machine => {
         tableString += `
            <a href='machines.html?mchname=${machine.machinename}' 
               class="item">
               <i class="fa fa-desktop"></i>
               <p>
                  ${machine.machinename}
               </p>
            </a>
         `;
      });

      tableString += `</td></tr>`;

      $("#usr-table tbody").append(tableString);

      getproductivityData(result);
   },
   error: function (xhr, status, error) {
      console.error(error);
   },
});

function getproductivityData(result) {
   let timeInterval = ",SUBSTRING(stamp, 1, 10) [timeInterval]";
   let timeIntervalFormat = "SUBSTRING(timeInterval, 12,13) + ':00'";
   let slctUsersId = usrid;
   let arrLock = [];

   let dateFrom = moment().add(-7, 'days').format('YYYY-MM-DDT00:00:00');
   let dateTo = moment().format('YYYY-MM-DDT23:59:59');

   let dates = [];

   for (let i = 0; i < 7; i++) {
      let dt = formatDate(new Date().addDays(-i)).toString();
      dates.push(dt.substring(0, 10));
   }

   let userData = alasql(`
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
      WHERE stamp >= '${dateFrom}' AND stamp <='${dateTo}' 
      AND userid = '${slctUsersId}'
      ORDER BY userid, stamp
   `, [result]);
   userData.forEach(function (d, idx) { d.rownum = idx });

   //console.table(userData);

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
            if (actualData.activeStatus == 1) { // ACTIVE TIME
               arrLock[i].activeTime = Math.abs(new Date(nextData.date) - new Date(actualData.date));
               arrLock[i].inactiveTime = 0;
            }
            else { // INACTIVE TIME
               arrLock[i].activeTime = 0
               arrLock[i].inactiveTime = Math.abs(new Date(nextData.date) - new Date(actualData.date));
            }
         }
      }
   }

   let activeInactiveDatabyUser = alasql(`
      SELECT userid, SUM(activeTime) activeMs, SUM(inactiveTime) inactiveMs
      FROM ? 
      GROUP BY userid
      ORDER BY userid
   `, [arrLock])

   activeInactiveDatabyUser.forEach(item => {
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
            userid: userId
         });
      }
   }
   //console.table(arrLock); // TIMES

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

   //console.table(activeInactiveData); // FINAL RESULT

   createGraph(activeInactiveData);
}

function createTable(data) {
   if (dataTable !== null)
      dataTable.destroy();

   dataTable = $('#example').DataTable({
      data: data,
      columns: [
         { data: "userid" },
         { data: "activeTime" },
         { data: "inactiveTime" }
      ],
      order: [0, 'asc'],
      rowCallback: function (row, data, index) {
         $(row).find('td:eq(0)').html(`<a href="users.html?usrid=${data['userid']}">${data['userid']}</a>`);
      },
      select: false,
      pageLength: 10,
      responsive: true,
      dom: '',
      retrieve: false,
      searching: false
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
         }
      ]
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
                  }
               },
               scaleLabel: {
                  display: true,
                  labelString: 'Total Hours'
               }
            },
         ],
         xAxes: [
            {
               scaleLabel: {
                  display: true,
                  labelString: 'Days / Hours'
               },
               stacked: true
            },
         ]
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

   ctx2 = document.getElementById("barChart").getContext("2d");
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
      d.getMonth().toString().length == 1 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
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