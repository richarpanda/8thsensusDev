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

      let data = alasql(`SELECT userid, machinename, devicelist, os, hardware FROM ?
         GROUP BY userid, machinename, devicelist, os, hardware
         ORDER BY userid`, [result]);

      var table = $('#example').DataTable({
         data: data,
         columns: [
            { data: "userid" },
            { data: "machinename" },
            { data: "devicelist" },
            { data: "os" },
            { data: "hardware" }
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