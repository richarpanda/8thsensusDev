$(document).ready(function () {
   createMenu();

   function createMenu() {
      const path = window.location.pathname.substring(1);
      pathLen = path.split("/");

      let navMenu = `
      <ul class="nav navbar-nav mr-auto">
         <li class="sub-menu ${path == "indexMain.html" ? "active" : ""}">
            <a href='${(pathLen.length > 1 ? "../" : "") + "indexMain.html"
         }'>
               <span>Home</span>
            </a>
         </li>

         <li class="sub-menu ${path == "productivity.html" ? "active" : ""}">
            <a href='${(pathLen.length > 1 ? "../" : "") + "productivity.html"
         }'>
               <span>Productivity</span>
            </a>
         </li>

         <li class="sub-menu ${path == "logs.html" ? "active" : ""}">
            <a href='${(pathLen.length > 1 ? "../" : "") + "logs.html"}'>
               <span>Logs</span>
            </a>
         </li>

         <li class='sub-menu'>
            <a href='#'>
               <span>Reports</span>
               <i class='fa fa-angle-down'></i>
            </a>
            <ul>
               <li>
                  <a href='${(pathLen.length == 1
            ? "reports/"
            : pathLen[0] !== "reports"
               ? "../reports/"
               : "") + "application.html"
         }'>
                     Application
                  </a>
               </li>
               <li>
                  <a href='${(pathLen.length == 1
            ? "reports/"
            : pathLen[0] !== "reports"
               ? "../reports/"
               : "") + "userMachine.html"
         }'>
                     User Machine
                  </a>
               </li>
               <li>
                  <a href='${(pathLen.length == 1
            ? "reports/"
            : pathLen[0] !== "reports"
               ? "../reports/"
               : "") + "accessLogs.html"
         }'>
                     Access Logs
                  </a>
               </li>
               <li>
                  <a href='${(pathLen.length == 1
            ? "reports/"
            : pathLen[0] !== "reports"
               ? "../reports/"
               : "") + "gpsLocations.html"
         }'>
                     Gps Locations
                  </a>
               </li>
            </ul>
         </li>

         <li class='sub-menu'>
            <a href='#'>
               <span>Admin</span>
               <i class='fa fa-angle-down'></i>
            </a>
            <ul>
               <li>
                  <a href='${(pathLen.length == 1
            ? "admin/"
            : pathLen[0] !== "admin"
               ? "../admin/"
               : "") + "userAccessManagement.html"
         }'>
                     User Access Management
                  </a>
               </li>
               <li>
                  <a href='${(pathLen.length == 1
            ? "admin/"
            : pathLen[0] !== "admin"
               ? "../admin/"
               : "") + "securityLogs.html"
         }'>
                     Security Logs
                  </a>
               </li>
               <li>
                  <a href='${(pathLen.length == 1
            ? "admin/"
            : pathLen[0] !== "admin"
               ? "../admin/"
               : "") + "userMachineManagement.html"
         }'>
                     User / Machine Management
                  </a>
               </li>
               <li>
                  <a href='${(pathLen.length == 1
            ? "admin/"
            : pathLen[0] !== "admin"
               ? "../admin/"
               : "") + "reportAdmin.html"
         }'>
                     Report Admin
                  </a>
               </li>
               <li>
                  <a href='${(pathLen.length == 1
            ? "admin/"
            : pathLen[0] !== "admin"
               ? "../admin/"
               : "") + "locationProfiles.html"
         }'>
                     Location Profiles MGMT
                  </a>
               </li>
            </ul>
         </li>        
      </ul>
      <ul class="nav navbar-top-links navbar-right">
         <li>
            <a href="login.html">
               <i class="fa fa-sign-out"></i> Log out
            </a>
         </li>
      </ul>`;

      $(".dinamyc-nav-menu").html(navMenu);
   }

   $(".sub-menu ul").hide();
   $(".sub-menu a").click(function () {
      $(".sub-menu ul").hide();
      $(this).parent(".sub-menu").children("ul").slideToggle("200");
      $(this).find("i.fa").toggleClass("fa-angle-up fa-angle-down");
   });
});
