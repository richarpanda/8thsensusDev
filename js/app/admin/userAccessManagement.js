$(document).ready(function () {
   let dataSet = null;
   var slctMachine = [];

   function getAllUsers() {
      $.ajax({
         url: "https://dashboard.8thsensus.com:8181/employee/all",
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

   function getUserById() {
      $.ajax({
         url: "https://dashboard.8thsensus.com:8181/employee/all",
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

   $('#addUserForm').on('submit', function (e) { //use on if jQuery 1.7+
      e.preventDefault();  //prevent form from submitting
      let userRequest = {
         "anchorAddress": document.getElementById("inptAnchorAddress").value,
         "anchorGPS": document.getElementById("inptAnchorGPS").value,
         "customerId": document.getElementById("inptCustomerId").value,
         "department": document.getElementById("inptDepartment").value,
         "firstName": document.getElementById("inptFirstName").value,
         "id": document.getElementById("inptId").value,
         "key": document.getElementById("inptKey").value,
         "lastName": document.getElementById("inptLastName").value,
         "role": document.getElementById("inptRole").value,
         "telephone": document.getElementById("inptTelephone").value,
         "userId": document.getElementById("inptUserId").value,
         "utc": Date().now
      }
      saveUser(userRequest);
   });

   function saveUser(userRequest) {
      $.ajax({
         url: "https://dashboard.8thsensus.com:8181/employee/save",
         headers: {
            "Content-Type": "application/json",
         },
         type: "POST",
         dataType: "json",
         data: userRequest,
         success: function (result) {
            console.log(result);
         },
         error: function (err) {
            console.log("Error:");
            console.log(err);
         },
      });
   }

   function deleteUser() {
      $.ajax({
         url: "https://dashboard.8thsensus.com:8181/employee/all",
         headers: {
            "Content-Type": "application/x-www-form-urlencoded",
         },
         type: "DELETE",
         dataType: "json",
         data: {},
         success: function (result) { },
         error: function () {
            console.log("error");
         },
      });
   }

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

         let usersData = alasql(
            `
           SELECT UPPER(userid) [userid], 'View' [permission]
           FROM ?
           GROUP BY UPPER(userid)
           ORDER BY userid
        `,
            [result]
         );

         let slctUsersHtml = `<option value=""></option>`;

         usersData.forEach((user) => {
            slctUsersHtml += `
              <option value="${user.userid}">${user.userid}</option>
           `;
         });

         $("#slctUserId").html(slctUsersHtml);
         $(".ms-selectall").trigger("click");

         var table = $("#example").DataTable({
            data: usersData,
            columns: [{ data: "userid" }, { data: "permission" }],
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

         table.column(1).data().unique();
         $("#example tr").css("cursor", "hand");
      },
      error: function () {
         console.log("error");
      },
   });

   function formatDate(utcDate) {
      let d = new Date(utcDate);
      let month =
         d.getMonth().toString().length == 1
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

   function setCheckValue(val, checked) {
      if (checked) {
         slctMachine.push(val);
      } else {
         let index = slctMachine.indexOf(val);
         if (index > -1) {
            slctMachine.splice(index, 1);
         }
      }
   }
});
