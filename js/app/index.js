let tAccountLicenses;

/*********************************************************/

let dataSet = null;

$.ajax({
   url: "https://dashboard.8thsensus.com:8080/message",
   headers: {
      "Content-Type": "application/x-www-form-urlencoded",
   },
   type: "GET" /* or type:"GET" or type:"PUT" */,
   dataType: "json",
   data: {},
   success: function (result) {
      startOfWeek = "2021-04-05T01:35:35.648732Z";
      //var productData = alasql("SELECT diagcode, utc FROM ? WHERE userid='Kingpin' and utc > '" + startOfWeek + "' order by utc",[result]);

      var productData = alasql("SELECT COUNT(diagcode) FROM ? order by utc", [
         result,
      ]);

      var start = new Date();
      var end = new Date();

      //var start = new Date();
      //start.setDate(start.getDate() - 2);

      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      var hourBefore;
      var hourAfter;
      var accountLicenses;
      var accountDevices;
      var accountIntrusions;
      var accountAlerts;

      var licensesArray = [];
      var devicesArray = [];
      var IntrusionsArray = [];
      var alertsArray = [];
      var accountDevicesTest = [];

      statCount();

      for (i = 0; i < 24; i++) {
         hourBefore = moment(start.setHours(start.getHours() + i)).format();
         hourAfter = moment(end.setHours(end.getHours() + i + 1)).format();

         accountLicenses = alasql(
            "SELECT COUNT(DISTINCT userid) licenses FROM ? WHERE utc >= '" +
            hourBefore +
            "' and utc < '" +
            hourAfter +
            "' order by utc",
            [result]
         );
         accountDevices = alasql(
            "SELECT COUNT(DISTINCT userid) devices FROM ? WHERE utc >= '" +
            hourBefore +
            "' and utc < '" +
            hourAfter +
            "' order by utc",
            [result]
         );
         accountIntrusions = alasql(
            "SELECT COUNT(DISTINCT userid) intrusions FROM ? WHERE utc >= '" +
            hourBefore +
            "' and utc < '" +
            hourAfter +
            "' and (diagcode = 'D0011' or diagcode = 'D0012') order by utc",
            [result]
         );
         accountAlerts = alasql(
            "SELECT COUNT(userid) alerts FROM ? WHERE utc >= '" +
            hourBefore +
            "' and utc < '" +
            hourAfter +
            "' order by utc",
            [result]
         );

         accountDevicesTest = alasql(
            "SELECT utc FROM ? WHERE utc >= '" +
            hourBefore +
            "' and utc < '" +
            hourAfter +
            "' order by utc",
            [result]
         );

         licensesArray.push(accountLicenses[0].licenses);
         devicesArray.push(accountDevices[0].devices);
         IntrusionsArray.push(accountIntrusions[0].intrusions);
         alertsArray.push(accountAlerts[0].alerts);

         start.setHours(0, 0, 0, 0);
         end.setHours(0, 0, 0, 0);
      }

      function statCount() {
         const today = moment();
         const hourBefore = moment(today.startOf("day")).format();
         const hourAfter = moment(today.endOf("day")).format();

         const yesterday = moment();

         const yesterdayHourBefore = moment(yesterday.startOf("day")).format();
         const yesterdayHourAfter = moment(yesterday.endOf("day")).format();

         console.log(hourBefore + " - " + hourAfter);

         accountLicenses = alasql(
            "SELECT COUNT(distinct UPPER(userid)) as licenses FROM ?",
            [result]
         );
         accountDevices = alasql("SELECT COUNT(DISTINCT userid) devices FROM ?", [
            result,
         ]);
         accountIntrusions = alasql(
            "SELECT COUNT(DISTINCT userid) intrusions FROM ? WHERE utc >= '" +
            hourBefore +
            "' and utc < '" +
            hourAfter +
            "' and (diagcode = 'D0011' or diagcode = 'D0012') order by utc",
            [result]
         );
         accountAlerts = alasql(
            "SELECT COUNT(userid) alerts FROM ? WHERE utc >= '" +
            hourBefore +
            "' and utc < '" +
            hourAfter +
            "' order by utc",
            [result]
         );

         var countLicenses = accountLicenses[0].licenses;
         var countDevices = accountDevices[0].devices;
         console.log(countDevices);
         var countIntrusions = accountIntrusions[0].intrusions;
         var countAlerts = accountAlerts[0].alerts;

         $("#licUser").html(countLicenses);
         tAccountLicenses = countLicenses;
         $("#activeUsers_24hours").html(countLicenses);
         /*graph*/
         /*Devices*/
         let devicesAction = countLicenses;
         console.log(countLicenses);
         var doughnutData = {
            labels: ["Active", "Inactive"],
            datasets: [
               {
                  data: [devicesAction, 0],
                  backgroundColor: ["#a3e1d4", "#dedede"],
               },
            ],
         };
         var doughnutOptions = {
            legend: { display: true },
            responsive: true,
            title: {
               display: true,
               text: "Total Licenses:" + countLicenses,
               verticalAlign: "center",
               textAlign: "center",
               textBaseline: "middle",
            },
         };
         var ctx4 = document.getElementById("doughnutChart").getContext("2d");
         new Chart(ctx4, {
            type: "doughnut",
            data: doughnutData,
            options: doughnutOptions,
         });
         /*Alerts and Intrusions*/
         var lineData = {
            labels: [
               "Monday",
               "Tuesday",
               "Wednesday",
               "Thursday",
               "Friday",
               "Saturday",
               "Sunday",
            ],
            datasets: [
               {
                  label: "Alerts",
                  backgroundColor: "rgba(26,179,148,0.5)",
                  borderColor: "rgba(26,179,148,0.7)",
                  pointBackgroundColor: "rgba(26,179,148,1)",
                  pointBorderColor: "#fff",
                  data: [28, 48, 40, 19, 86, 27, 90],
                  stack: "Stack 0",
               },
               {
                  label: "Intrusions",
                  backgroundColor: "rgba(220, 220, 220, 0.5)",
                  pointBorderColor: "#fff",
                  data: [65, 59, 80, 81, 56, 55, 40],
                  stack: "Stack 1",
               },
            ],
         };
         var lineOptions = {
            legend: { display: true },
            responsive: true,
            scales: {
               xAxes: [{ stacked: true }],
               yAxes: [{ stacked: true }],
            },
            interaction: {
               intersect: false,
            },
            onClick: function (e) {
               var day = this.getElementsAtEvent(e)[0]._model.label;
               location.href = "logs.html?day=" + day;
            },
         };

         var ctx = document.getElementById("lineChart").getContext("2d");
         new Chart(ctx, { type: "bar", data: lineData, options: lineOptions });

         /*************************************************************************************/
         $("#devices").html(countDevices);
         $("#activeDevices_24hours").html(countDevices);

         $("#intrusions").html(countIntrusions);
         $("#intrusions_24hours").html(countIntrusions);

         $("#alerts").html(countAlerts);
      }

      var matrix = result.length;
      //alert(result[0].userid);

      var countItem = 0;

      var uniqueNames = [];
      var currentDT = new Date();
      var subHour = 0;
      var timeNow = new Date();
      var stamTime;
      var sessionTime;
      var today = new Date();
      var activeUser = 0;
      var activeUserJson = [];
      var dataMatch = false;
      var htmlString = "";
      var loactionInfo = "";

      for (i = 0; i < result.length; i++) {
         if (result[i].length > 1) {
            //console.log(result[i].stamp);
            stamTime = new Date(result[i].stamp);

            oneHoursBefore = new Date(today.getTime());
            oneHoursAfter = new Date(today.getTime() - 1000 * 60 * 60);

            for (x = 0; x < result.length; x++) {
               //console.log(oneHoursBefore + '    <    ' + new Date(result[x].stamp) + '    >    ' + oneHoursAfter);
               sessionTime = result[x].stamp;
               if (
                  Date.parse(oneHoursBefore) > Date.parse(sessionTime) &&
                  Date.parse(oneHoursAfter) < Date.parse(sessionTime)
               ) {
                  //console.log(oneHoursBefore + '    <    ' + sessionTime + '    >    ' + oneHoursAfter);
                  activeUser = activeUser + 1;
                  dataMatch = true;
               }
            }

            if (dataMatch) {
               activeUserJson.push([oneHoursBefore, activeUser]);
            }

            today = oneHoursAfter;
            activeUser = 0;
            dataMatch = false;
         }
      }

      //console.log(JSON.stringify(activeUserJson));

      for (y = 0; y < result.length; y++) {
         //if (result[y].length > 1) {
         if (uniqueNames.indexOf(result[y].userid) === -1) {
            uniqueNames.push(result[y].userid);
         }
         //}
      }

      //Licensed users
      for (y = 0; y < uniqueNames.length; y++) {
         //if (result[y].length > 1) {
         countItem = 1 + countItem;
         //}
      }

      //$('#licUser').html(countItem);
      //$('#activeUsers_24hours').html(countItem);

      //Devices
      countItem = 0;
      for (y = 0; y < uniqueNames.length; y++) {
         //alert(uniqueNames[i]);
         //console.log('Unique Names: ' + uniqueNames[i]);
         countItem = 1 + countItem;
      }

      //$('#devices').html(countItem);
      //$('#activeDevices_24hours').html(countItem);

      //Intrusions
      countItem = 0;
      $.each(result, function (i, v) {
         if (v.diagcode == "D0011" || v.diagcode == "D0012") {
            countItem = 1 + countItem;
         }
      });

      //$('#intrusions').html(countItem);
      //$('#intrusions_24hours').html(countItem);

      //Alerts
      countItem = 0;
      $.each(result, function (i, v) {
         //if ((v.diagcode == 'D0003') || (v.diagcode == 'D0004') || (v.diagcode == 'D0005') || (v.diagcode == 'D0013')) {
         countItem = 1 + countItem;
         //}
      });

      //$('#alerts').html(countItem);

      for (i = 0; i < 100; i++) {
         var gpsNumbers = result[i].gps;
         var longlatArray = result[i].gps.split(",");
         var timeStamp = result[i].stamp;
         var userName = result[i].userid;
         var diagcode = result[i].diagcode;
         var htmlString_1 = "";
         var htmlString_2 = "";
         var apiURL = "";
         var data = "";

         getCodeData(longlatArray, userName, formatDate(timeStamp), diagcode, i);
      }

      function getCode(code) {
         var codeDiscription = "";
         var codeJson = [
            {
               D0001:
                  "Screen Unlocked | Initial Login after reboot | Confidence 1:5,000,000",
               D0002:
                  "Screen Unlocked | Zero Touch Unlocked authorized user |  1:5,000,000",
               D0003:
                  "Screen Locked 0 | Zero Touch Locked no user present | Confidence 1:5,000,000",
               D0004:
                  "Screen Locked 2 | Manual Lock Initiated by authorized user |  1:5,000,000",
               D0005:
                  "Screen Locked 1| Lock without Camera | Confidence 1:5,000,000",
               D0006:
                  "Screen Unlocked | Authorized user certified | Confidence 1:25,000,000",
               D0007:
                  "Screen Locked 2 | Manual Lock Initiated by authorized user | Manual Process",
               D0008:
                  "Screen Unlocked | Unauthorized user(s) presented |  Confidence 1:5,000,000",
               D0009:
                  "Screen Locked 1 | Unauthorized user(s) presented  | Confidence 1:5,000,000",
               D0010: "Screen Unlocked | Authorized user(s) presented | 1:5,000,000",
               D0011:
                  "Screen Unlocked | Unauthorized user(s) presented | Confidence 1:100,000",
               D0012:
                  "Screen Locked 3 | Power Savings Lock Initiated | System Process",
               D0013: "Screen Unlocked | 8th Sensus EVE Stopped | Error",
               D0014:
                  "Screen Unlocked | Video Conference in progress| Confidence 1:5,000,000",
               D0015:
                  "Screen Locked 1 | Over the Shoulder unauthorized user(s) presented |  > 1",
            },
         ];

         $.each(codeJson[0], function (key, value) {
            if (code == key) {
               codeDiscription = value;
            }
         });
         return codeDiscription;
      }

      function getCodeData(longlatArray, userName, timeStamp, diagcode, count) {
         if (longlatArray[0] !== "") {
            apiURL = "https://api.bigdatacloud.net/data/reverse-geocode/";
            var longlatArray = result[i].gps.split(",");
            var latitude = longlatArray[0];
            var longitude = longlatArray[1];
            data = {
               latitude: longlatArray[0],
               longitude: longlatArray[1],
               localityLanguage: "en",
               key: "b0067cd12214491aa5317a26c85a007b",
            };
         } else {
            apiURL =
               "https://api.bigdatacloud.net/data/ip-geolocation-with-confidence/";
            var ipAddress = result[i].remoteip;
            data = {
               ip: ipAddress,
               localityLanguage: "en",
               key: "d915f9ffc0134077a61239935a7673df",
            };
         }

         $.ajax({
            type: "GET",
            url: apiURL,
            data: data,
            success: function (data) {
               var state = "";
               var town = "";
               var postcode = "";

               if (gpsNumbers !== "") {
                  state = data.principalSubdivision;
                  town = data.locality;
                  postcode = data.postcode;
               } else {
                  state = data.location.isoPrincipalSubdivision;
                  town = data.location.localityName;
                  postcode = data.location.postcode;
               }

               var address = town + " " + postcode + ", " + state;

               var geoCodeInfo = getCode(diagcode);

               var url = "../activity_logs/devices/?usrid=" + userName;

               htmlString_1 = htmlString_1 + "<tr /*onclick=myFunction('" + url + "')*/>";
               htmlString_1 = htmlString_1 + "<td><i class='fa fa-clock-o'></i> " + timeStamp + "</td>";
               htmlString_1 = htmlString_1 + "<td><a href='users.html?usrid=" + userName + "'>" + userName + "</td>";
               /*htmlString_1 = htmlString_1 + "<td>" + address + "</td>";*/

               htmlString_1 =
                  htmlString_1 +
                  "<td class='text-navy'> <i class='fa fa-level-up'></i>" +
                  geoCodeInfo +
                  "</td>";
               htmlString_1 = htmlString_1 + "</tr>";

               $("#intrusion-insights tbody").append(htmlString_1);
               htmlString_1 = "";

               if (count < 4) {
                  htmlString_2 = htmlString_2 + "<div class='feed-element'>";
                  htmlString_2 = htmlString_2 + "<div>";
                  htmlString_2 =
                     htmlString_2 +
                     "<small class='float-right text-navy'>1m ago</small>";
                  htmlString_2 = htmlString_2 + "<strong>" + address + "</strong>";
                  htmlString_2 = htmlString_2 + "<div>" + geoCodeInfo + "</div>";
                  htmlString_2 =
                     htmlString_2 +
                     "<small class='text-muted'>" +
                     timeStamp +
                     "</small>";
                  htmlString_2 = htmlString_2 + "</div>";
                  htmlString_2 = htmlString_2 + "</div>";

                  $("#geo-loc-hotspots").html(htmlString_2);
               }
            },
            error: function (xhr, ajaxOptions, thrownError) {
               //alert(thrownError + "\r\n" + xhr.statusText + "\r\n" + xhr.responseText);
            },
         }).done(function (done) {
            //alert("Ajax Done successfully");
         });
      }

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
   },
   error: function (xhr, status, error) {
      //alert(error);
   },
});

function myFunction(url) {
   $(location).attr("href", url);
}
/*******************************************************************************************************/
