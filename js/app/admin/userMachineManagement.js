const key = webConfig.key;

var userData = null;
var dataTable = null;
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
   let result = JSON.parse(await getMessage());

   document.getElementById("loader").classList.remove("show-loader");
   document.getElementById("loader").classList.add("hide-loader");

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

   let slctUsersHtml = `<option value=""></option>`;

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

         $(row).find('td:eq(1)').html(machinesHtml);
         $(row).find('td:eq(4)').html(`<a href="../logs.html?usrid=${data.userid}">See Logs</a>`);
         $(row).find('td:eq(5)').html(formatDate(data.stamp));
         $(row).find('td:eq(6)').html(`
            <button class="btn btn-outline-primary d-inline" data-toggle="modal" data-target="#unlockWarn" onClick='getUserData(${JSON.stringify(data)})'>
               <i class="fa fa-unlock-alt" aria-hidden="true"></i> Unlock
            </button>
            <button class="btn btn-outline-primary d-inline" data-toggle="modal" data-target="#updateWarn" onClick='getUserData(${JSON.stringify(data)})'>
               <i class="fa fa-arrow-circle-up" aria-hidden="true"></i> Update User
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

   let result = JSON.parse(await getMessage());
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
      ${slctUserId !== "" ? " AND UPPER(userid) = '" + slctUserId + "'" : ""} GROUP BY UPPER(userid)`;

   let tableData = alasql(filterQuery, [result]);

   console.table(tableData);

   dataTable = $('#example').DataTable({
      data: tableData,
      columns: [
         { data: "userid" },
         { data: "assets" }, // Number of assets
         { data: "version" },
         { data: "license" },
         { data: null },
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

         $(row).find('td:eq(1)').html(machinesHtml);
         $(row).find('td:eq(4)').html(`<a href="../logs.html?usrid=${data.userid}">See Logs</a>`);
         $(row).find('td:eq(5)').html(formatDate(data.stamp));
         $(row).find('td:eq(6)').html(`
            <button class="btn btn-outline-primary d-inline" data-toggle="modal" data-target="#unlockWarn" onClick='getUserData(${JSON.stringify(data)})'>
               <i class="fa fa-unlock-alt" aria-hidden="true"></i> Unlock
            </button>
            <button class="btn btn-outline-primary d-inline" data-toggle="modal" data-target="#updateWarn" onClick='getUserData(${JSON.stringify(data)})'>
               <i class="fa fa-arrow-circle-up" aria-hidden="true"></i> Update User
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
            `unlock('${ document.getElementById("intpMinutes").value }')` :
            `update('${ userData.license }')`,
         customerId: userData.license,
         key: key,
         machineName: userData.machinename,
         userId: userData.userId,
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
