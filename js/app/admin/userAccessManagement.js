const dataLakeUrl = webConfig.dataLakeUrl;
const key = webConfig.key;

var dataTable = null;
var slctMachine = [];
var selectedUsers = [];
var sessionData = {
   customerId: webConfig.customerFilter,
   department: "TestDepartment",
   userId: "LoggedTestUser"
};

toastr.options = {
   "closeButton": true,
   "progressBar": true,
   "timeOut": "2000",
   "extendedTimeOut": "1000"
}

$(document).ready(function () {
   $("#addUserForm").on("submit", function (e) {
      e.preventDefault();
      let userRequest = {
         anchorAddress: document.getElementById("inptAnchorAddress").value,
         anchorGPS: document.getElementById("inptAnchorGPS").value,
         customerId: sessionData.customerId,
         department: sessionData.department,
         firstName: document.getElementById("inptFirstName").value,
         key: key,
         lastName: document.getElementById("inptLastName").value,
         role: document.getElementById("inptRole").value,
         telephone: document.getElementById("inptTelephone").value,
         userId: document.getElementById("inptUserId").value
      };
      saveUser(userRequest);
   });

   getAllUsers();

   function getAllUsers() {
      $.ajax({
         url: dataLakeUrl + "/employee/all",
         headers: {
            "Content-Type": "application/x-www-form-urlencoded",
         },
         type: "GET",
         dataType: "json",
         data: {},
         success: function (result) {
            document.getElementById("loader").classList.remove("show-loader");
            document.getElementById("loader").classList.add("hide-loader");

            let usersData = alasql(`
                  SELECT UPPER(userId) [userId], 'View' [permission]
                  FROM ?
                  WHERE customerId = '${ webConfig.customerFilter }'
                  GROUP BY UPPER(userId)
                  ORDER BY userId
               `, [result]);

            let slctUsersHtml = `
                  <label for="slctuserId">User ID:</label>
                  <select name="slctuserId[]" multiple id="slctuserId">`;

            usersData.forEach(user => {
               slctUsersHtml += `
                     <option value="${user.userId}">${user.userId.toUpperCase()}</option>
                  `;
            });
            slctUsersHtml += '</select>';

            $("#slctContainer").html(slctUsersHtml);
            $('#slctuserId').multiselect({
               columns: 1,
               placeholder: 'Select Users',
               search: true,
               selectAll: true
            });

            $(".ms-selectall").trigger("click");

            generateTable(usersData);
         },
         error: function () {
            console.log("error");
         },
      });
   }

   function getUserById() {
      $.ajax({
         url: dataLakeUrl + "/employee/all",
         headers: {
            "Content-Type": "application/x-www-form-urlencoded",
         },
         type: "GET",
         dataType: "json",
         data: {},
         success: function (result) { },
         error: function () {
            console.log("error");
         },
      });
   }

   function saveUser(userRequest) {
      $.ajax({
         url: dataLakeUrl + "/employee/save",
         headers: {
            "Content-Type": "application/json",
         },
         type: "POST",
         data: JSON.stringify(userRequest),
         success: function (result) {
            toastr.success('User saved successfully', 'Success');
            saveLog(userRequest);
            getAllUsers();
            cleanForm();
            $('#addUserModal').modal('hide');
         },
         error: function (err) {
            console.log("Error:");
            console.log(err);
         },
      });
   }

   function saveLog(userRequest) {
      let request = {
         accessId: "string",
         customerId: sessionData.customerId,
         eventType: "User Creation",
         key: key,
         logEntry: `User: ${ userRequest.userId } created`,
         userId: sessionData.userId,
      };

      $.ajax({
         url: dataLakeUrl + "/log/save",
         headers: {
            "Content-Type": "application/json",
         },
         type: "POST",
         data: JSON.stringify(request),
         success: function (result) {
            console.log(result);
         },
         error: function () {
            console.log("error");
         },
      });
   }

   function formatDate(utcDate) {
      let d = new Date(utcDate);
      let month =
         (d.getMonth()+ 1).toString().length == 1 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
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

   function cleanForm() {
      document.getElementById("inptAnchorAddress").value = '';
      document.getElementById("inptAnchorGPS").value = '';
      document.getElementById("inptFirstName").value = '';
      document.getElementById("inptLastName").value = '';
      document.getElementById("inptRole").value = '';
      document.getElementById("inptTelephone").value = '';
      document.getElementById("inptUserId").value = '';
   }
});

function selectUser() {
   $.ajax({
      url: dataLakeUrl + "/employee/all",
      headers: {
         "Content-Type": "application/x-www-form-urlencoded",
      },
      type: "GET",
      dataType: "json",
      data: {},
      success: function (result) {
         let slctUsersId = "";
         document.getElementById("loader").classList.remove("show-loader");
         document.getElementById("loader").classList.add("hide-loader");

         if (selectedUsers.length == 0) {
            let usersData = alasql(`
               SELECT UPPER(userid)
               FROM ?
               WHERE userId IN (${slctUsersId}'')
               GROUP BY userId`, [result]);

            usersData.forEach((user) => selectedUsers.push(user.userId));
         }
         selectedUsers.forEach((user) => (slctUsersId += `'${user}',`));

         let usersData = alasql(`
            SELECT UPPER(userId) [userId], 'View' [permission]
            FROM ?
            WHERE UPPER(userId) IN (${slctUsersId}'')
            ORDER BY UPPER(userid)`, [result]);

         generateTable(usersData);
      },
      error: function () {
         console.log("error");
      },
   });
}

function generateTable(data) {
   if (dataTable !== null)
      dataTable.destroy();

   dataTable = $("#example").DataTable({
      data: data,
      columns: [{ data: "userId" }, { data: "permission" }],
      order: [[0, "asc"]],
      select: true,
      pageLength: 25,
      responsive: true,
      dom: 'rt<"bottom"p><"html5buttons"B><"clear">',
      buttons: [
         { extend: "copy" },
         { extend: "csv" },
         { extend: "excel", title: "ExampleFile" },
         { extend: "pdf", title: "ExampleFile" },

         {
            extend: "print",
            customize: function (win) {
               $(win.document.body).addClass("white-bg");
               $(win.document.body).css("font-size", "10px");

               $(win.document.body)
                  .find("table")
                  .addClass("compact")
                  .css("font-size", "inherit");
            },
         },
      ],
   });

   dataTable.column(1).data().unique();
   $("#example tr").css("cursor", "hand");
}

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