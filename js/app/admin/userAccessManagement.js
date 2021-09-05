let dataSet = null;
var slctMachine = [];

$.ajax({
   url: 'https://dashboard.8thsensus.com:8080/message',
   headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
   },
   type: "GET",
   dataType: "json",
   data: {
   },
   success: function (result) {
      document.getElementById("loader").classList.remove("show-loader");
      document.getElementById("loader").classList.add("hide-loader");

      let usersData = alasql(`
         SELECT UPPER(userid) [userid], 'View' [permission]
         FROM ?
         GROUP BY UPPER(userid)
         ORDER BY userid
      `, [result]);

      let slctUsersHtml = `<option value=""></option>`;

      usersData.forEach(user => {
         slctUsersHtml += `
            <option value="${user.userid}">${user.userid}</option>
         `;
      });

      $("#slctUserId").html(slctUsersHtml);
      $(".ms-selectall").trigger("click");
      
      var table = $('#example').DataTable({
         data: usersData,
         columns: [
            { data: "userid" },
            { data: "permission" }
         ],
         order: [[0, "asc"]],
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

      table.column(1).data().unique();
      $("#example tr").css('cursor', 'hand');
   },
   error: function () {
      console.log("error");
   }
});

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