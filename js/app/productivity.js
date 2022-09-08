var dataTable = null;
var weekDataTable = null;
var ctx2 = null;
var chart = null;
var selectedUsers = [];
var selectedDeps = [];
var dateFrom = moment().add(0, 'days').format('YYYY-MM-DDT00:00:00');
var dateTo = moment().format('YYYY-MM-DDT23:59:59');

Date.prototype.addDays = function (days) {
   var date = new Date(this.valueOf());
   date.setDate(date.getDate() + days);
   return date;
}

$(function () {
   $('[data-toggle="tooltip"]').tooltip()
});

document.getElementById("loader").classList.add("show-loader");

$(function () {
   $('input[name="daterange"]').daterangepicker({
      autoApply: true,
      opens: 'left',
      minDate: new Date().addDays(-30),
      maxDate: new Date(),
      startDate: new Date().addDays(-1),
      endDate: new Date(),
   }, function (start, end) {
      let startD = start.format('YYYY-MM-DD');
      let endD = end.format('YYYY-MM-DD');

      dateFrom = start.format('YYYY-MM-DDTHH:mm:ss');
      dateTo = end.format('YYYY-MM-DDT23:59:59');
   });
});

init();

async function init() {
   let res = JSON.parse(await getMessage());
   let resa = JSON.parse(await getActionsAll());
   let hr = JSON.parse(await getHumanResourceAll());

   let resultA = alasql(`
      SELECT 
         CASE 
            WHEN NOT LEN(a.userId) >= 0 THEN r.userid
            ELSE a.userId
         END [userid],
         r.id,r.key, r.customerid, r.mac,r.remoteip,r.diagcode,r.version,r.machinename,r.devicelist,r.confidence,r.type,r.os,r.hardware,r.applications,r.perfcounters,r.localip,r.gps,r.utc,r.stamp
      FROM ? r
      LEFT JOIN ? a 
      ON r.machinename IN a.machineName
      WHERE customerid = '${webConfig.customerFilter}'
   `, [res, resa]);

   let resultB = alasql(`
      SELECT userid, id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
      FROM ? r
      GROUP BY userid, id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
      `, [resultA]);

   let resultC = alasql(`
      SELECT userid, id, key, customerid, h.department, h.anchorGPS, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp, role
      FROM ? r
      INNER JOIN ? h
      ON UPPER(r.userid) IN UPPER(h.userId)
      `, [resultB, hr]);
      
   let timeObj = {
      dateFrom: dateFrom,
      dateTo: dateTo
   }

   let distinctRes = JSON.parse(await getDistinctValues(timeObj));
   let transData = await transformData(distinctRes);

   document.getElementById("loader").classList.remove("show-loader");
   document.getElementById("loader").classList.add("hide-loader");

   let result = alasql(`
      SELECT rc.userid, version, r.machineName, totalHours, rc.department, MAX(rc.role), MAX(rc.utc)
      FROM ? r
      INNER JOIN ? rc
      ON r.machineName = rc.machinename
      GROUP BY rc.userid, version, r.machineName, totalHours, rc.department
   `, [transData, resultC]);

   let usersData = alasql(`
      SELECT UPPER(userid) [userid]
      FROM ?
      GROUP BY UPPER(userid)
      ORDER BY userid
   `, [resultC]);

   let slctUsersHtml = `<option value="0">Select a user</option>`;

   usersData.forEach(user => {
      slctUsersHtml += `
         <option value="${user.userid}">${user.userid.toUpperCase()}</option>
      `;
   });
   slctUsersHtml += '</select>';

   $("#slctUserId").html(slctUsersHtml);

   let departmentsData = alasql(`
      SELECT UPPER(department) [department]
      FROM ?
      GROUP BY UPPER(department)
      ORDER BY department
   `, [resultC]);

   let slctDepartmentHtml = `
      <label for="slctDepartment">Department:</label>
      <select name="slctDepartment[]" multiple id="slctDepartment">`;

   departmentsData.forEach(dep => {
      slctDepartmentHtml += `
         <option value="${dep.department}">${dep.department.toUpperCase()}</option>
      `;
   });
   slctDepartmentHtml += '</select>';

   $("#slctDepContainer").html(slctDepartmentHtml);
   $('#slctDepartment').multiselect({
      columns: 1,
      placeholder: 'Select Department',
      search: true,
      selectAll: true
   });

   $(".ms-selectall").trigger("click");
   getproductivityData(result);
}

async function transformData(data) {
   let result = [];
   let machinesArr = data[0].machinename;
   let userIdArr = data[0].userid;
   let versionArr = data[0].version;

   for (let i = 0; i < machinesArr.length; i++) {
      result[i] = {
         department: null,
         machineName: machinesArr[i],
         userId: userIdArr[i],
         version: versionArr[i] === undefined ? '--' : versionArr[i],
         totalHours: await getUserPresentTime({
            machineName: machinesArr[i],
            dateFrom: dateFrom,
            dateTo: dateTo
         })
      }
   }
   return result;
}

function setCheckValue(val, checked) {
   if (checked) {
      selectedDeps.push(val);
   }
   else {
      let index = selectedDeps.indexOf(val);
      if (index > -1) {
         selectedDeps.splice(index, 1);
      }
   }
}

async function getproductivityData(result = null) {
   document.getElementById("loader").classList.add("show-loader");
   document.getElementById("loader").classList.remove("hide-loader");

   if (result == null) {
      let res = JSON.parse(await getMessage());
      let resa = JSON.parse(await getActionsAll());
      let hr = JSON.parse(await getHumanResourceAll());

      let slctUserId = document.getElementById("slctUserId").value;
      let slctDeps = "";
   
      let resultA = alasql(`
         SELECT 
            CASE 
               WHEN NOT LEN(a.userId) >= 0 THEN r.userid
               ELSE a.userId
            END [userid],
            r.id,r.key, r.customerid, r.mac,r.remoteip,r.diagcode,r.version,r.machinename,r.devicelist,r.confidence,r.type,r.os,r.hardware,r.applications,r.perfcounters,r.localip,r.gps,r.utc,r.stamp
         FROM ? r
         LEFT JOIN ? a 
         ON r.machinename IN a.machineName
         WHERE customerid = '${webConfig.customerFilter}'
      `, [res, resa]);
   
      let resultB = alasql(`
         SELECT userid, id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
         FROM ? r
         GROUP BY userid, id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
         `, [resultA]);
   
      let resultC = alasql(`
         SELECT userid, id, key, customerid, h.department, h.anchorGPS, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp, role
         FROM ? r
         INNER JOIN ? h
         ON UPPER(r.userid) IN UPPER(h.userId)
         `, [resultB, hr]);
   
      let timeObj = {
         dateFrom: dateFrom,
         dateTo: dateTo
      }
   
      let distinctRes = JSON.parse(await getDistinctValues(timeObj));
      let transData = await transformData(distinctRes);

      if (selectedDeps.length == 0) {
         let depsData = alasql(`
            SELECT UPPER(department) [department]
            FROM ?
            GROUP BY UPPER(department)
            ORDER BY department
         `, [result]);
      
         depsData.forEach(dep => selectedDeps.push(dep.department));
         selectedDeps.forEach(dep => slctDeps += `'${dep}',`);
      } else
         selectedDeps.forEach(dep => slctDeps += `'${dep}',`);

      let userIdCondition = slctUserId !== '0' ? "AND UPPER(rc.userid) = '" + slctUserId + "'" : '';
      let deptsCondition = `AND UPPER(rc.department) IN (${ slctDeps }'')`

      document.getElementById("loader").classList.remove("show-loader");
      document.getElementById("loader").classList.add("hide-loader");
   
      let query = `
         SELECT rc.userid, version, r.machineName, totalHours, rc.department
         FROM ? r
         LEFT JOIN ? rc
         ON r.machineName = rc.machinename
         ${ userIdCondition }
         ${ deptsCondition }
         GROUP BY rc.userid, version, r.machineName, totalHours, rc.department
      `;

      let result = alasql(query, [transData, resultC]);
      ProcessData(result);
   }
   else {
      ProcessData(result);
   }
}

async function ProcessData(result) {
   document.getElementById("loader").classList.remove("show-loader");
   document.getElementById("loader").classList.add("hide-loader");

   let tableData = alasql(`
      SELECT
         UPPER(userid) userId, version, machineName, totalHours, department, totalHoursSec
      FROM ? 
      ORDER BY department, userid
   `, [result]);

   tableData.forEach(item => {
      item.totalHours = parseInt(item.totalHours.slice(1, -1));
      item.totalHoursSec = secsToTime(item.totalHours);
   });

   createTable(tableData);

   let hr = JSON.parse(await getHumanResourceAll());
   insertHR(hr, result);
}

function getTableReportData(data, result) {
   let hoursObj = [];
   let hoursFinal = [];
   let usersData = alasql(`
      SELECT DISTINCT(UPPER(userid)) userid
      FROM ?
      GROUP BY userid
      ORDER BY userid
   `, [result]);

   for (let i = 0; i < data.length; i++) {
      data[i].hour = parseInt(data[i].date.substring(11, 13));
      data[i].date = data[i].date.substring(0, 10);
   }

   let dates = alasql(`
      SELECT DISTINCT date
      FROM ?
   `, [data]);

   dates.forEach(date => {
      usersData.forEach(user => {
         hoursObj.push({
            userid: user.userid.trim().toUpperCase(),
            '_0': 0,
            '_1': 0,
            '_2': 0,
            '_3': 0,
            '_4': 0,
            '_5': 0,
            '_6': 0,
            '_7': 0,
            '_8': 0,
            '_9': 0,
            '_10': 0,
            '_11': 0,
            '_12': 0,
            '_13': 0,
            '_14': 0,
            '_15': 0,
            '_16': 0,
            '_17': 0,
            '_18': 0,
            '_19': 0,
            '_20': 0,
            '_21': 0,
            '_22': 0,
            '_23': 0,
            'totalHours': '00:00:00'
         });
      });

      let hoursDate = alasql(`
         SELECT userid, weekday, weeknumber, hour, date
         FROM ?
         WHERE date = '${ date.date }' AND activeStatus = 1
         GROUP BY userid, weekday, weeknumber, hour, date
         ORDER BY date, hour
      `, [data]);

      // console.table(hoursDate);

      hoursDate.forEach(element => {
         let indx = hoursObj.findIndex(x => x.userid == element.userid);
         Object.getOwnPropertyNames(hoursObj[indx]).forEach(function (val, idx, array) {
            if (val === "_" + element.hour) {
               hoursObj[indx][val] = 1;
            }
         });
      });

      hoursFinal.push({
          date: date,
          hoursArr: hoursObj
      });

      hoursObj = [];
   });

   let totalData = alasql(`
      SELECT userid, weeknumber, date, SUM(activeTime) [activeTime]
      FROM ? GROUP BY userid, weeknumber, date
   `, [data]);

   totalData.forEach(item => {
      hoursFinal.find(x => x.date.date == item.date)
         .hoursArr.find(y => y.userid == item.userid).totalHours = msToTime(item.activeTime);
   });

   createWeekTable(hoursFinal);
}

function createWeekTable(data) {
   $("#table_hours_user").html('');
   let htmlString = "";

   for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      if (htmlString == "") {
         htmlString = `
            <h4 class="float-left">Date: ${item.date.date} </h4>                     
            <table class="table table-bordered">
               <thead>
                  <tr>
                     <th>User Id</th>
                     <th>0</th>
                     <th>1</th>
                     <th>2</th>
                     <th>3</th>
                     <th>4</th>
                     <th>5</th>
                     <th>6</th>
                     <th>7</th>
                     <th>8</th>
                     <th>9</th>
                     <th>10</th>
                     <th>11</th>
                     <th>12</th>
                     <th>13</th>
                     <th>14</th>
                     <th>15</th>
                     <th>16</th>
                     <th>17</th>
                     <th>18</th>
                     <th>19</th>
                     <th>20</th>
                     <th>21</th>
                     <th>22</th>
                     <th>23</th>
                     <th>Total Hours</th>
                  </tr>
               </thead>
               <tbody>`;
      }

      item.hoursArr.forEach(itemHour => {
         htmlString += `
            <tr>
               <td>${ itemHour.userid }</td>
               <th class="${ itemHour._0 == 1 ? 'hour-color' : '' }"></th>
               <td class="${ itemHour._1 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._2 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._3 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._4 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._5 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._6 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._7 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._8 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._9 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._10 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._11 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._12 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._13 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._14 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._15 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._16 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._17 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._18 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._19 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._20 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._21 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._22 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._23 == 1 ? 'hour-color' : '' }"></td>
               <td>${ itemHour.totalHours }</td>
            </tr>`;
      });

      htmlString += `</tbody></table>`
      $("#table_hours_user").append(htmlString);

      htmlString = "";
   }
}

function createTable(data) {
   let dateRange = document.getElementById("inptDateRange").value;
   $(".productivity-table tbody").empty();

   $("#table_hours").html('');
   let htmlString = "";

   for (let i = 0; i < data.length; i++) {
      const item = data[i];
      let colorClass ='green';
      
      if (htmlString == "") {
         htmlString = `
            <h4 class="float-left">Department: ${data[i].department} </h4>                     
            <table class="table productivity-table">
               <thead>
                  <tr>
                     <th>Name</th>
                     <th>UserId</th>
                     <th>MachineName</th>
                     <th>Version</th>
                     <th>Total Hours</th>
                     <!-- <th>Timeline</th> -->
                  </tr>
               </thead>
               <tbody>`;
      }

      htmlString += `
         <tr>
            <td class="image">
               <img src="img/Circle-icons-profile.svg" alt="user-profile" class="grid-img" />
            </td>
            <td style="width: 30%;" class="font-weight-bold">${item.userId}</td>
            <td style="width: 30%;" class="font-weight-bold">${item.machineName}</td>
            <td style="width: 25%;"class='${colorClass}'>${item.version}</td>
            <td class="${item.totalHours > 0 ? 'font-weight-bold' : ''}">
               <i class="fa fa-clock-o" aria-hidden="true"></i>
               ${item.totalHoursSec}
            </td>
         </tr>`;

      if ((data[i + 1] !== undefined && data[i + 1].department !== data[i].department) || i == data.length - 1) {
         htmlString += `</tbody></table>`
         $("#table_hours").append(htmlString);

         htmlString = "";
      }
   }
}

function createGraph(graphData) {
   const data = {
      labels: getGraphLabels(graphData),
      datasets: [
         {
            label: "At Desk",
            backgroundColor: "rgba(26,179,148,0.5)",
            borderColor: "rgba(26,179,148,0.7)",
            pointBackgroundColor: "rgba(26,179,148,1)",
            pointBorderColor: "#fff",
            data: getGraphUnlockValues(graphData),
            stack: "Stack 1",
         }
      ]
   };

   const config = {
      type: 'bar',
      data: data,
      options: {
         indexAxis: 'y',
         scales: {
            x: {
               ticks: {
                  callback: function (label, index, labels) {
                     return '';
                  }
               }
            },
         },
         plugins: {
            tooltip: {
               callbacks: {
                  label: function (tooltipItem) {
                     return msToTime(tooltipItem.raw);
                  }
               }
            }
         }
      },
   };

   if (chart !== null)
      chart.destroy();

   chart = new Chart(
      document.getElementById('barChart'),
      config
   );
}

function getGraphLabels(data) {
   let result = [];
   data.forEach(item => {
      result.push(item.userid);
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

function secsToTime(s) {
   function pad(n, z) {
      z = z || 2;
      return ('00' + n).slice(-z);
   }

   var secs = s % 60;
   s = (s - secs) / 60;
   var mins = s % 60;
   var hrs = (s - mins) / 60;

   return pad(hrs) + ':' + pad(mins) + ':00'
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

   return pad(hrs) + ':00' + ':00'
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
   if (parseInt(range) == 1) {
      return ",SUBSTRING(utc, 1, 13) [timeInterval]";
   }
   else {
      return ",SUBSTRING(utc, 1, 10) [timeInterval]";
   }
}

function getWeekDay(day) {
   switch (day) {
      case 1:
         return 'Monday';
      case 2:
         return 'Tuesday';
      case 3:
         return 'Wednesday';
      case 4:
         return 'Thursday';
      case 5:
         return 'Friday';
      case 6:
         return 'Saturday';
      case 7:
         return 'Sunday';
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

function insertHR(hr, res) {
   let usersFilter = alasql(`
      SELECT r.userid,
      CASE
         WHEN LEN(hr.userId) >= 0 THEN hr.userId
         ELSE 'NULL'
      END [hrUserId],
      r.customerid, r.version as role
      FROM ? r
      LEFT JOIN ? hr 
      ON r.userid = hr.userId OR UPPER(r.userid) = UPPER(hr.userId)
      GROUP BY r.userid,CASE WHEN LEN(hr.userId) >= 0 THEN hr.userId ELSE 'NULL' END, r.customerid, r.version
   `, [res, hr]);

   let insertUsers = alasql(`
      SELECT UPPER(userid) [userid], hrUserId, customerid, MAX(role) [role]
      FROM ? 
      WHERE hrUserId = 'NULL' AND userid <> 'undefined'
      GROUP BY UPPER(userid), hrUserId, customerid
   `, [usersFilter]);
	
   // console.table(insertUsers);
   // insertUsers.forEach(item => {
   //    saveHrUser(item);
   // });
}

// $("#slctUserId").on('change', async function () {
//    document.getElementById("loader").classList.add("show-loader");
//    document.getElementById("loader").classList.remove("hide-loader");
//    let userid = this.value;

//    let res = JSON.parse(await getMessage());
//    let hr = JSON.parse(await getHumanResourceAll());

//    let usersData = alasql(`
//       SELECT UPPER(us.userid) [userid]
//       FROM ? us
//       INNER JOIN ? h ON us.userid = h.userId
//       WHERE 
//       GROUP BY UPPER(userid)
//       ORDER BY userid
//    `, [res, hr]);

//    let slctUsersHtml = `<option value="0">Select a user</option>`;

//    usersData.forEach(user => {
//       slctUsersHtml += `
//          <option value="${user.userid}">${user.userid.toUpperCase()}</option>
//       `;
//    });
//    slctUsersHtml += '</select>';

//    $("#slctUserId").html(slctUsersHtml);

//    document.getElementById("loader").classList.remove("show-loader");
//    document.getElementById("loader").classList.add("hide-loader");

//    $(".ms-selectall").trigger("click");
// });

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
