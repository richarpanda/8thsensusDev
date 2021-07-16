let tAccountLicenses;
let dataSet = null;

document.getElementById("loader").classList.add("show-loader");
$.ajax({
   url: "https://dashboard.8thsensus.com:8080/message",
   headers: { "Content-Type": "application/x-www-form-urlencoded" },
   type: "GET",
   dataType: "json",
   data: {},
   success: function (result) {
      document.getElementById("loader").classList.remove("show-loader");
      document.getElementById("loader").classList.add("hide-loader");
      const querystring = window.location.search;
      const params = new URLSearchParams(querystring);
      const machinename = params.get('mchname');

      $("#machine").html(`<b>Machine:</b> ${ machinename }`);

      let data = alasql(`
         SELECT customerid, devicelist, os, hardware, localip, applications, gps
         FROM ?
         WHERE machinename = '${ machinename }'
         GROUP BY customerid, devicelist, os, hardware, localip, applications, gps
         `, [result]);

      let gpsData = alasql(`
         SELECT gps
         FROM ?
         WHERE machinename = '${ machinename }'
         GROUP BY gps
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

      let tableString = `
         <tr>
            <td><b>Customer Id: </b> ${ data[0].customerid }</td>
         </tr>
         <tr>
            <td><b>Device List: </b> ${ data[0].devicelist }</td>
         </tr>
         <tr>
            <td><b>OS: </b> ${ data[0].os }</td>
         </tr>
         <tr>
            <td><b>Hardware: </b> ${ data[0].hardware }</td>
         </tr>
         <tr>
            <td><b>Local IP: </b> ${ data[0].localip }</td>
         </tr>`;

      tableString += "<tr><td><b>Applications: </b>";
      apps.forEach(app => {
         tableString += `
            <br />
            &nbsp;&nbsp;&nbsp;&nbsp;
            <b>
               <a href='logs.html?mchname=${ machinename }&application=${ app }'>
               ${ app }
               </a>
            </b>`;
      });

      
      tableString += "</td></tr>";
      tableString += `<tr><td class='table-list-items'><b>Geolocalization list: </b><br/><br />`;
      gpsData.forEach(gpsItem => {
         if (gpsItem.gps !== "no data presented") {
            tableString += `
               <a class="item" onclick="initMap('${ gpsItem.gps }')">
                  <i class="fa fa-location-arrow"></i>
                  <p>
                     ${ gpsItem.gps }
                  </p>
               </a>
            `;
         }
      });
      tableString += `</td></tr>`;

      $("#machine-table tbody").append(tableString);
   },
   error: function (xhr, status, error) {
      console.error(error);
   },
});

function initMap(gps) {
   let gpsArr = gps.split(',');
   let lat = parseFloat(gpsArr[0].trim());
   let long = parseFloat(gpsArr[1].trim());
   const uluru = { lat: lat, lng: long };
   const map = new google.maps.Map(document.getElementById("map"), {
      zoom: 8,
      center: uluru,
   });
   const marker = new google.maps.Marker({
      position: uluru,
      map: map,
   });

   var element = document.getElementById("map-container");
   element.classList.remove("hide-map");
   element.classList.add("show-map");
}