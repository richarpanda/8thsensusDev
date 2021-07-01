let tAccountLicenses;

/*********************************************************/

let dataSet = null;


$.ajax({
   url: "https://dashboard.8thsensus.com:8080/message",
   headers: { "Content-Type": "application/x-www-form-urlencoded" },
   type: "GET",
   dataType: "json",
   data: {},
   success: function (result) {
      const querystring = window.location.search;
      const params = new URLSearchParams(querystring);
      const machinename = params.get('mchname');

      $("#machine").html(`<b>Machine:</b> ${ machinename }`);

      let data = alasql(`
         SELECT applications, gps
         FROM ?
         WHERE machinename = '${ machinename }'
         GROUP BY applications, gps
         `, [result]);

      let apps = [];
      data.forEach(element => {
         element.applications = element.applications.replace('{',' ');
         element.applications = element.applications.replace('}',' ');

         let elementApps = (element.applications.split('|')[0] + element.applications.split('|')[1]).split(',');
         elementApps.forEach(app => {
            if (apps.indexOf(app) === -1)
               apps.push(app);
         });
      });

      let tableString = "<tr><td><b>Applications: </b>";
      apps.forEach(app => {
         tableString += `
            <br />
            &nbsp;&nbsp;&nbsp;&nbsp;
            <b>
               <a href='logs.html?mchname=${ machinename }&application=${ app }'>
               ${ app }
               </a>
            </b>`;
      })

      tableString += "</td></tr>"
      tableString += `<td><b>Geolocalization: </b>${data[0].gps}</td>`;

      $("#machine-table tbody").append(tableString);
   },
   error: function (xhr, status, error) {
      console.error(error);
   },
});