const key = webConfig.key;

var userData = null;
var dataTable = null;
var chart = null;
var slctMachine = [];
var selectedUsers = [];
var sessionData = {
   customerId: "TestCustomer",
   department: "TestDepartment",
   userId: "LoggedTestUser"
};

toastr.options = {
   "closeButton": true,
   "progressBar": true,
   "timeOut": "2000",
   "extendedTimeOut": "1000"
}

$("#unlockForm").submit(e => e.preventDefault());
$("#updateForm").submit(e => e.preventDefault());

init();
async function init() {
   let res = JSON.parse(await getMessage());
   let resa = JSON.parse(await getActionsAll());

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
      WHERE customerid = '${ webConfig.customerFilter }'
   `, [res, resa]);
   
   let result = alasql(`
      SELECT userid, r.id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
      FROM ? r
      WHERE customerid = '${ webConfig.customerFilter }'
      GROUP BY userid, id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
      `, [resultA]);

   document.getElementById("loader").classList.remove("show-loader");
   document.getElementById("loader").classList.add("hide-loader");

   generateLicencesGraph(result);
   
   let machinesData = alasql(`
      SELECT machinename
      FROM ?
      GROUP BY machinename
   `, [result]);

   let usersData = alasql(`
      SELECT UPPER(userid) [userid]
      FROM ?
      GROUP BY UPPER(userid)
      ORDER BY userid
   `, [result]);

   let slctUsersHtml = `<option value="0">Select a user</option>`;

   let slctMachineHtml = `<label for="slctMachine">Machine Name:</label>
         <select name="slctMachine[]" multiple id="slctMachine">`;

   machinesData.forEach(machine => {
      slctMachineHtml += `
            <option value="${machine.machinename}">${machine.machinename}</option>
         `;
   });

   usersData.forEach(user => {
      slctUsersHtml += `
            <option value="${user.userid}">${user.userid}</option>
         `;
   });

   $("#slctUserId").html(slctUsersHtml);
   $("#slctMachineContainer").html(slctMachineHtml);
   $('#slctMachine').multiselect({
      columns: 1,
      placeholder: 'Select Machines',
      selectAll: true
   });
   $(".ms-selectall").trigger("click");
   
   assets = alasql(`
         SELECT UPPER(userid) as userid, COUNT(DISTINCT machinename) as assets, MAX(version) as version, MAX(customerid) as license,
         MAX(stamp) stamp
         FROM ?
         GROUP BY UPPER(userid)`
      , [result]);

   insertHR(result);

   var matrix = result.length;
   if (dataTable !== null)
      dataTable.destroy();

   dataTable = $('#example').DataTable({
      data: assets,
      columns: [
         { data: "userid" },
         { data: "assets" }, // Number of assets
         { data: "version" },
         { data: "license" },
         { data: null },
         { data: null }
      ],
      order: [[0, "asc"]],
      rowCallback: function (row, data, index) {
         let userMachines = alasql(`SELECT DISTINCT machinename FROM ? WHERE UPPER(userid) = '${data.userid}'`, [result])
         let machinesHtml = '';

         userMachines.forEach(item => {
            machinesHtml += ` ${item.machinename}`;
         });
         data.machineName = machinesHtml;

         $(row).find('td:eq(0)').html(`<a style="font-weight: bold !important;" href="users.html?usrid=${data['userid']}">${data['userid']}</a>`);
         $(row).find('td:eq(1)').html(machinesHtml);
         $(row).find('td:eq(4)').html(formatDate(data.stamp));
         $(row).find('td:eq(5)').html(`
            <button class="btn btn-outline-primary d-inline" data-toggle="modal" data-target="#unlockWarn" onClick='getUserData(${JSON.stringify(data)})'>
               <i class="fa fa-unlock-alt" aria-hidden="true"></i> Unlock
            </button>
            <button class="btn btn-outline-primary d-inline" data-toggle="modal" data-target="#updateWarn" disabled>
               <i class="fa fa-lock" aria-hidden="true"></i> Lock
            </button>
            <button class="btn btn-outline-primary d-inline" data-toggle="modal" data-target="#updateWarn" onClick='getUserData(${JSON.stringify(data)})'>
               <i class="fa fa-arrow-circle-up" aria-hidden="true"></i> Update Client
            </button>`
         );
      },
      select: true,
      pageLength: 25,
      responsive: true,
      dom: 'rt<"bottom"p><"html5buttons"B><"clear">',
      buttons: [
         { extend: 'copy' },
         { extend: 'csv' },
         { extend: 'excel', title: 'ExampleFile' },
         { extend: 'pdf', title: 'ExampleFile' },

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

   dataTable.column(1).data().unique();
   $("#example tr").css('cursor', 'hand');
}

async function getUsers() {
   document.getElementById("loader").classList.add("show-loader");
   document.getElementById("loader").classList.remove("hide-loader");

   let res = JSON.parse(await getMessage());
   let resa = JSON.parse(await getActionsAll());

   let resultMax = alasql(`SELECT MAX(id) [id], userid FROM ? GROUP BY userid`, [res])
   let resultA = alasql(`
      SELECT 
         CASE 
            WHEN NOT LEN(a.userId) >= 0 THEN r.userid
            ELSE a.userId
         END [userid],
         r.id,r.key, r.customerid, r.mac,r.remoteip,r.diagcode,r.version,r.machinename,r.devicelist,r.confidence,r.type,r.os,r.hardware,r.applications,r.perfcounters,r.localip,r.gps,r.utc,r.stamp
      FROM ? r
      INNER JOIN ? max
      ON r.id = max.id
      LEFT JOIN ? a 
      ON r.machinename IN a.machineName
      WHERE customerid = '${ webConfig.customerFilter }'
   `, [res, resultMax, resa]);
   
   let result = alasql(`
      SELECT userid, r.id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
      FROM ? r
      WHERE customerid = '${ webConfig.customerFilter }'
      GROUP BY userid, id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
      `, [resultA]);

   let slctMachineStr = "";
   let slctUserId = document.getElementById("slctUserId").value;

   document.getElementById("loader").classList.remove("show-loader");
   document.getElementById("loader").classList.add("hide-loader");

   slctMachine.forEach(mach => slctMachineStr += `'${mach}',`);

   if (dataTable !== null)
      dataTable.destroy();
      assets = alasql(`
      SELECT UPPER(userid) as userid, COUNT(DISTINCT machinename) as assets, MAX(version) as version, MAX(customerid) as license,
      MAX(stamp) stamp
      FROM ?`
   , [result]);

   let filterQuery = `SELECT UPPER(userid) as userid, COUNT(DISTINCT machinename) as assets, machinename, MAX(version) as version, MAX(customerid) as license,
      MAX(stamp) stamp
      FROM ?
      WHERE machinename IN (${slctMachineStr}'')
      ${slctUserId !== "" && slctUserId !== "0" ? " AND UPPER(userid) = '" + slctUserId + "'" : ""} GROUP BY UPPER(userid)`;

   let tableData = alasql(filterQuery, [result]);

   dataTable = $('#example').DataTable({
      data: tableData,
      columns: [
         { data: "userid" },
         { data: "assets" }, // Number of assets
         { data: "version" },
         { data: "license" },
         { data: null },
         { data: null }
      ],
      order: [[0, "asc"]],
      rowCallback: function (row, data, index) {
         let userMachines = alasql(`SELECT DISTINCT machinename FROM ? WHERE UPPER(userid) = '${data.userid}'`, [result])
         let machinesHtml = '';

         userMachines.forEach(item => {
            machinesHtml += ` ${item.machinename}`;
         });

         data.machineName = machinesHtml;

         $(row).find('td:eq(0)').html(`<a style="font-weight: bold !important;" href="users.html?usrid=${data['userid']}">${data['userid']}</a>`);
         $(row).find('td:eq(1)').html(machinesHtml);
         $(row).find('td:eq(4)').html(formatDate(data.stamp));
         $(row).find('td:eq(5)').html(`
            <button class="btn btn-outline-primary d-inline" data-toggle="modal" data-target="#unlockWarn" onClick='getUserData(${JSON.stringify(data)})'>
               <i class="fa fa-unlock-alt" aria-hidden="true"></i> Unlock
            </button>
            <button class="btn btn-outline-primary d-inline" data-toggle="modal" data-target="#updateWarn" disabled>
               <i class="fa fa-lock" aria-hidden="true"></i> Lock
            </button>
            <button class="btn btn-outline-primary d-inline" data-toggle="modal" data-target="#updateWarn" onClick='getUserData(${JSON.stringify(data)})'>
               <i class="fa fa-arrow-circle-up" aria-hidden="true"></i> Update Client
            </button>`
         );
      },
      select: true,
      pageLength: 25,
      responsive: true,
      dom: 'rt<"bottom"p><"html5buttons"B><"clear">',
      buttons: [
         { extend: 'copy' },
         { extend: 'csv' },
         { extend: 'excel', title: 'ExampleFile' },
         { extend: 'pdf', title: 'ExampleFile' },

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

   dataTable.column(1).data().unique();
   $("#example tr").css('cursor', 'hand');
}

function generateLicencesGraph(result) {
   let licensesDates = alasql(`
      SELECT userid, SUBSTRING(utc, 1, 10) [utc] FROM ?
   `, [result]);
   
   let licencesPerDay = alasql(`
      SELECT userid, utc FROM ?
      GROUP BY userid, utc
      ORDER BY utc DESC
   `, [licensesDates]);
   
   let licensesPerDayArr = []
   let objLicensesPerDay = {};
   let counter = 1;

   for (let i = 0; i < licencesPerDay.length; i++) {
      if (counter == 1) {
         objLicensesPerDay = {};
      }

      if (i != licencesPerDay.length -1) {
         if (licencesPerDay[i + 1].utc == licencesPerDay[i].utc) {
            counter++;
         }
         else {
            objLicensesPerDay = {
               licensesCount: counter,
               date: licencesPerDay[i].utc
            };

            counter = 1;
            licensesPerDayArr.push(objLicensesPerDay);
         }
      }
   }

   let finalResult = alasql(`SELECT TOP 14 * FROM ? ORDER BY date DESC`, [licensesPerDayArr]);

   const data = {
      labels: getGraphLabels(finalResult),
      datasets: [
         {
            label: "Active licences per day",
            backgroundColor: "rgba(26,179,148,0.5)",
            borderColor: "rgba(26,179,148,0.7)",
            pointBackgroundColor: "rgba(26,179,148,1)",
            pointBorderColor: "#fff",
            data: getGraphLicenses(finalResult),
            stack: "Stack 1",
         }
      ]
   };

   const config = {
      type: 'bar',
      data: data
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
      result.push(item.date);
   });
   return result;
}

function getGraphLicenses(data) {
   let result = [];
   data.forEach(item => {
      result.push(item.licensesCount);
   });
   return result;
}

function getUserData(data) {
   userData = data;
}

function saveAction(action) {
   $('#unlockWarn').modal('hide');
   $('#updateWarn').modal('hide');

   $.ajax({
      url: dataLakeUrl + "/actions/save",
      headers: {
         "Content-Type": "application/json",
      },
      type: "POST",
      data: JSON.stringify({
         accessId: "-1",
         actionType: action == 'UNLOCK' ? 
            `unlock(${ document.getElementById("intpMinutes").value })` :
            `update('latest')`,
         customerId: userData.license,
         key: key,
         machineName: userData.machineName.trim(),
         userId: userData.userid.trim(),
         verified: "-1"
      }),
      success: function (result) {
         toastr.success('Action completed successfully', 'Success');
      },
      error: function (err) {
         console.log("Error:");
         console.log(err);
      },
   });
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

function setCheckValue(val, checked) {
   if (checked) {
      slctMachine.push(val);
   }
   else {
      let index = slctMachine.indexOf(val);
      if (index > -1) {
         slctMachine.splice(index, 1);
      }
   }
}

function deleteSelection() {
   $(document).ready(function() {
      $('#slctUserId option:selected').remove();
   });
}



$("#slctUserId").on('change', async function () {
   document.getElementById("loader").classList.add("show-loader");
   document.getElementById("loader").classList.remove("hide-loader");
   let userid = this.value;

   let result = JSON.parse(await getMessage());

   document.getElementById("loader").classList.remove("show-loader");
   document.getElementById("loader").classList.add("hide-loader");

   let machinesData = alasql(`
      SELECT machinename
      FROM ?
      WHERE UPPER(userid) = '${userid}' OR userid = '${userid}'
      GROUP BY machinename
   `, [result]);

   let slctMachineHtml = `<label for="slctMachine">Machine Name:</label>
      <select name="slctMachine[]" multiple id="slctMachine">`;

   machinesData.forEach(machine => {
      slctMachineHtml += `<option value="${machine.machinename}">${machine.machinename}</option>`;
   });

   $("#slctMachineContainer").html(slctMachineHtml);
   $('#slctMachine').multiselect({
      columns: 1,
      placeholder: 'Select Machines',
      selectAll: true
   });

   $(".ms-selectall").trigger("click");
});


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

async function insertHR(res) {
   let hr = JSON.parse(await getHumanResourceAll());
   // console.table(hr);

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
