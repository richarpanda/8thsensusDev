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

      let data = [];
      let users = alasql(`SELECT userid FROM ? GROUP BY userid`, [result]);

      users.forEach(user => {
         var apps = '';
         let userApps = alasql(`SELECT applications FROM ? WHERE userid = '${ user.userid }' GROUP BY applications`, [result]);

         userApps.forEach(element => {
            element.applications = element.applications.replace('{',' ');
            element.applications = element.applications.replace('}',' ');
      
            let elementApps = (element.applications.split('|')[0] + element.applications.split('|')[1]).split(',');
            elementApps.forEach(app => {
               if (apps == '') {
                  apps += "<a href='#' class='apps-link'>" + app.trim();
               }
               else {
                  if (!apps.includes(app.trim()))
                     apps += ", <a href='#' class='apps-link'>" + app.trim()
               }
            });
         });

         data.push({
            userid: user.userid,
            apps: apps
         })
      });
      
      var table = $('#example').DataTable({
         data: data,
         columns: [
            { data: "userid" },
            { data: "apps" }
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