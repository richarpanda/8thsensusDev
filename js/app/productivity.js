var dataTable = null;
var ctx2 = null;
var chart = null;
var selectedUsers = [];
var dateFrom = moment().add(-1, 'days').format('YYYY-MM-DDT00:00:00');
var dateTo = moment().add(-1, 'days').format('YYYY-MM-DDT23:59:59');
var slctDateRange = 1;

Date.prototype.addDays = function (days) {
   var date = new Date(this.valueOf());
   date.setDate(date.getDate() + days);
   return date;
}

document.getElementById("loader").classList.add("show-loader");
$(function () {
   $('input[name="daterange"]').daterangepicker({
      autoApply: true,
      opens: 'left',
      minDate: new Date().addDays(-30),
      maxDate: new Date(),
      startDate: new Date().addDays(-1),
      endDate: new Date(),
   }, function (start, end, label) {
      let startD = start.format('YYYY-MM-DD');
      let endD = end.format('YYYY-MM-DD');

      dateFrom = start.format('YYYY-MM-DDTHH:mm:ss');
      dateTo = end.format('YYYY-MM-DDTHH:mm:ss');

      if (moment(dateTo, 'YYYY-MM-DD').add(-1, 'days').format('YYYY-MM-DD') == startD || endD == startD)
         slctDateRange = 1;
      else 
         slctDateRange = 7;
   });
});

$.ajax({
   url: 'https://dashboard.8thsensus.com:8080/message',
   headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
   },
   type: "GET",
   dataType: "json",
   contentType: 'application/json',
   data: {
   },
   success: function (result) {
      document.getElementById("loader").classList.remove("show-loader");
      document.getElementById("loader").classList.add("hide-loader");

      let usersData = alasql(`
         SELECT UPPER(userid) [userid]
         FROM ?
         GROUP BY UPPER(userid)
         ORDER BY userid
      `, [result]);

      let slctUsersHtml = `
         <label for="slctUserId">User ID:</label>
         <select name="slctUserId[]" multiple id="slctUserId">`;

      usersData.forEach(user => {
         slctUsersHtml += `
            <option value="${user.userid}">${user.userid.toUpperCase()}</option>
         `;
      });
      slctUsersHtml += '</select>';

      $("#slctContainer").html(slctUsersHtml);
      $('#slctUserId').multiselect({
         columns: 1,
         placeholder: 'Select Users',
         search: true,
         selectAll: true
      });

      $(".ms-selectall").trigger("click");
      getproductivityData();
   },
   error: function (request, status, error) {
      console.error(error);
   }
});

function setCheckValue(val, checked) {
   if (checked) {
      selectedUsers.push(val);
   }
   else {
      let index = selectedUsers.indexOf(val);
      if (index > -1) {
         selectedUsers.splice(index, 1);
      }
   }
}

function getproductivityData() {
   document.getElementById("loader").classList.add("show-loader");
   document.getElementById("loader").classList.remove("hide-loader");
   $.ajax({
      url: "https://dashboard.8thsensus.com:8080/message",
      headers: {
         "Content-Type": "application/x-www-form-urlencoded",
      },
      type: "GET",
      dataType: "json",
      data: {},
      success: function (result) {
         document.getElementById("loader").classList.remove("show-loader");
         document.getElementById("loader").classList.add("hide-loader");

         let dateRangeString = document.getElementById("inptDateRange").value;
         let timeInterval = getTimeInterval(slctDateRange);
         let timeIntervalFormat = parseInt(slctDateRange) == 1 ? "SUBSTRING(timeInterval, 12,13) + ':00'" : "SUBSTRING(timeInterval, 1,10)";
         let slctUsersId = "";
         let arrLock = [];
         let dates = [];
         let labelData = {
            totalEmployes: 0,
            avgHours: 0,
            mostActive: "",
            leastActive: ""
         }

         if (selectedUsers.length == 0) {
            let usersData = alasql(`
               SELECT userid
               FROM ?
               GROUP BY userid
            `, [result]);
            labelData.totalEmployes = selectedUsers.length;
            usersData.forEach(user => selectedUsers.push(user.userid));
            selectedUsers.forEach(user => slctUsersId += `'${user}',`);
         } else
            labelData.totalEmployes = selectedUsers.length - 1;
         selectedUsers.forEach(user => slctUsersId += `'${user}',`);

         if (slctDateRange == 1) {
            dates.push(dateFrom.substring(0, 10));
            dates.push(dateTo.substring(0, 10));
         }
         else
            for (let i = 0; i < slctDateRange; i++) {
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
            AND userid IN (${slctUsersId}'')
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
            SELECT userid, '${dateRangeString}' [dateRange] ,SUM(activeTime) activeMs, SUM(inactiveTime) inactiveMs
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
            let date = arrLock[0].date;
            let userId = arrLock[0].userid;
            let actualHour = new Date().getHours()

            for (let dt = 0; dt < dates.length; dt++) {
               if (parseInt(slctDateRange) === 1) {
                  for (let hr = 0; hr < 24; hr++) {
                     if ((dt == 0 && hr >= actualHour) || (dt == 1 && hr <= actualHour)) {
                        let timeI = date.substring(0, 11);
                        arrLock.push({
                           activeStatus: 1,
                           activeTime: 0,
                           date: dates[dt],
                           inactiveTime: 0,
                           rownum: 0,
                           timeInterval: hr.toString().length == 1 ? timeI + "0" + hr.toString() : timeI + hr.toString(),
                           userid: userId
                        });
                     }
                  }
               }
               else {
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
         }
         //console.table(arrLock); // TIMES

         let activeInactiveData = alasql(`
            SELECT SUBSTRING(date, 1, 10) [date], SUM(activeTime) activeMs, SUM(inactiveTime) inactiveMs,
               ${timeIntervalFormat} AS [timeInterval]
            FROM ? 
            GROUP BY SUBSTRING(date, 1, 10), ${timeIntervalFormat}
            ORDER BY [date], [timeInterval]
         `, [arrLock])

         activeInactiveData.forEach(item => {
            item.activeTime = msToTime(item.activeMs);
            item.inactiveTime = msToTime(item.inactiveMs);
         });

         //console.table(activeInactiveData); // FINAL RESULT

         if (arrLock.length > 0) {
            let mostleastData = alasql(`SELECT COUNT(userid) [userCount], userid FROM ? GROUP BY userid`, [arrLock]);
            labelData.avgHours = msToTime(alasql(`SELECT AVG(activeMs) [avgHours] FROM ?`, [activeInactiveData])[0].avgHours);
            labelData.mostActive = alasql(`SELECT TOP 1 userCount, userid FROM ? ORDER BY userCount DESC`, [mostleastData])[0].userid;
            labelData.leastActive = alasql(`SELECT TOP 1 userCount, userid FROM ? ORDER BY userCount ASC`, [mostleastData])[0].userid;
         }

         let lableGraphHtml = `
            <p><b>Total Number of Employees: </b>${labelData.totalEmployes + 1}</p>
            <p><b>Average Hours: </b>${labelData.avgHours}</p>
            <p><b>Most Active: </b>${labelData.mostActive == "" ? "" : labelData.mostActive.toUpperCase()}</p>
            <p><b>Least Active: </b>${labelData.leastActive == "" ? "" : labelData.leastActive.toUpperCase()}</p>
         `;
         $("#label-graph-info").html(lableGraphHtml);

         createGraph(activeInactiveData);
      },
      error: function (err) {
         console.error(err);
      }
   });
}

function createTable(data) {
   let dateRange = document.getElementById("inptDateRange").value;

   if (dataTable !== null)
      dataTable.destroy();

   dataTable = $('#example').DataTable({
      data: data,
      columns: [
         { data: "userid" },
         { data: "dateRange" },
         { data: "activeTime" },
         { data: "inactiveTime" }
      ],
      order: [0, 'asc'],
      rowCallback: function (row, data, index) {
         $(row).find('td:eq(0)').html(`<a href="users.html?usrid=${data['userid']}">${data['userid']}</a>`);
      },
      select: true,
      pageLength: 500,
      responsive: true,
      // dom: 'rt<"bottom"flp><"html5buttons"B><"clear">',
      dom: 'rt<"bottom"p><"html5buttons"B><"clear">',
      retrieve: true,
      searching: false,
      buttons: [
         { extend: 'copy' },
         { extend: 'csv' },
         { extend: 'excel', title: `Productivity Report ${dateRange}` },
         { extend: 'pdf', title: `Productivity Report ${dateRange}` },
         {
            extend: 'print',
            customize: function (win) {
               $(win.document.body).addClass('white-bg');
               $(win.document.body).css('font-size', '10px');

               $(win.document.body).find('table')
                  .addClass('compact')
                  .css('font-size', 'inherit');
            }
         }
      ]
   });
}

function createGraph(graphData) {
   var barData = {
      labels: getGraphLabels(graphData),
      datasets: [
         {
            label: "Active",
            backgroundColor: "rgba(26,179,148,0.5)",
            borderColor: "rgba(26,179,148,0.7)",
            pointBackgroundColor: "rgba(26,179,148,1)",
            pointBorderColor: "#fff",
            data: getGraphUnlockValues(graphData),
         },
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
               }
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

function getTimeInterval(range) {
   switch (parseInt(range)) {
      case 1:
         return ",SUBSTRING(stamp, 1, 13) [timeInterval]";
      case 7:
      case 14:
      case 30:
         return ",SUBSTRING(stamp, 1, 10) [timeInterval]";
      default:
         console.log(range);
         break;
   }
}