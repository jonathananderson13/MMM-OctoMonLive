//MMM-OctoMon.js:

/* Magic Mirror
 * Module: MMM-OctoMonLive
 *
 * By Chris Thomas
 * MIT Licensed.
 */
 
Module.register("MMM-OctoMonLive",{
	// Default module config.
	defaults: {
		elecApiUrl: "",
		api_key: "",
		updateInterval: 60000*60,
		displayDays: 7,
		elecMedium: 10,
		elecHigh: 20,
		elecCostKWH: 0.1372,
		elecCostSC: 0.25,
		decimalPlaces: 2,
		showUpdateTime: true,
		retryDelay: 5000,
		animationSpeed: 2000,
	},

	start: function() {
		Log.log("start()");

		var self = this;
		var elecDataRequest=null;

		this.elecLoaded=false;

		this.getElecData(2);
		
		setInterval(function() {
			self.getElecData(2);
		}, this.config.updateInterval);

	},

	getElecData: function(retries) {
		Log.log("getElecData(retries=" + retries + ")");

		var self = this;

		var hash = btoa(this.config.api_key + ":");

		if(this.config.elecApiUrl!="")
		{
			var elecDataRequest = new XMLHttpRequest();
			elecDataRequest.open("GET", this.config.elecApiUrl, true);
			elecDataRequest.setRequestHeader("Authorization","Basic " + hash);
			elecDataRequest.onreadystatechange = function() {
				Log.log("getElecData() readyState=" + this.readyState);
				if (this.readyState === 4) {
					Log.log("getElecData() status=" + this.status);
					if (this.status === 200) {
						self.processElecData(JSON.parse(this.response));
						retries=0;
					} else if (this.status === 401) {
						self.elecLoaded = false;
						self.updateDom(self.config.animationSpeed);
						Log.error(self.name, "getElecData() 401 error. status=" + this.status);
					} else {
						self.elecLoaded = false;
						self.updateDom(self.config.animationSpeed);
						Log.error(self.name, "getElecData() Could not load data. status=" + this.status);
					}
					
					if (retries>0) {
						retries=retries-1;
						self.scheduleElecRetry(retries);
					}
				}
			};
			elecDataRequest.send();
		}

	},

	scheduleElecRetry: function(retries) {
		Log.log("scheduleElecRetry() retries=" + retries);
		var self = this;
		setTimeout(function() {
			self.getElecData(retries);
		}, self.config.retryDelay);
	},


	// Override dom generator.
	getDom: function() {
		Log.log("getDom()");
		var wrapper = document.createElement("div");

		var errors = "";

		if (this.config.api_key === "") {
			errors = errors + "API Key (api_key) not set in config.</br>";
		}

		if(errors != "") {
			wrapper.innerHTML = errors;
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if(this.elecLoaded == false) {
			wrapper.innerHTML = "Querying Server...";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		var table = document.createElement("table");
		table.className="small";

		var headerrow = document.createElement("tr");

		var headerdatelabel = document.createElement("td");
		headerdatelabel.innerHTML = ""; //or you could display a date column header: "<span class=\"fa fa-calendar-alt small\"></span> Date";
		headerdatelabel.className = "small";
		headerdatelabel.style.verticalAlign = "top";
		headerdatelabel.style.textAlign = "center";

		var headereleclabel = document.createElement("td");
		headereleclabel.innerHTML = "<span class=\"fa fa-plug small\"></span> Elec";
		headereleclabel.className = "small";
		headereleclabel.style.verticalAlign = "top";
		headereleclabel.style.textAlign = "center";
		

		headerrow.appendChild(headerdatelabel);
		if(this.elecDataRequest) headerrow.appendChild(headereleclabel);
		table.appendChild(headerrow);
		
		var i=0;
		var intLoop=0;
		var intDays=this.config.displayDays; //how many days of history to show
		var dteLoop = new Date();//start today and go backwards
		if(true)
		{
			//if true, actually, start from first day's worth of available data
			//the api only seems to be able to return data from two days ago
			//so this skips over 'today' and 'yesterday' that have no displayable data yet
			
			var elecdate;
			if (this.elecDataRequest) {
				if(typeof this.elecDataRequest.results[0] !== 'undefined') {
					elecdate = new Date(this.elecDataRequest.results[0].interval_start);
				}
			}
			
			if(typeof elecdate == 'undefined') {
				elecdate = new Date();
			}
			
			dteLoop=elecdate;
		}

		var strDays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
		
		for(intLoop=0;intLoop<intDays;intLoop++)
		{
			var thisrow = document.createElement("tr");
			
			var thisdatelabel = document.createElement("td");
			thisdatelabel.innerHTML = strDays[dteLoop.getDay()] + " " + dteLoop.toLocaleDateString();
			thisdatelabel.className = "small";
			
			var thiseleclabel = document.createElement("td");
			thiseleclabel.innerHTML = "---";
			thiseleclabel.className = "small";
			thiseleclabel.style.textAlign = "center";

			//we're looking for elec results for this day
			if (this.elecDataRequest) {
				for(i=0;i<intDays;i++) {
					if(typeof this.elecDataRequest.results[i] !== 'undefined') {
						var edate = new Date(this.elecDataRequest.results[i].interval_start);
						if(edate.toLocaleDateString() == dteLoop.toLocaleDateString()) {
							
							var strCol = "white";//could be green
							var intVal = this.elecDataRequest.results[i].consumption.toFixed(this.config.decimalPlaces);
							if(intVal>=this.config.elecMedium)strCol="color:orange";
							if(intVal>=this.config.elecHigh)strCol="color:red";

							strUse = intVal + " kWh";
							strCost="";
							if(this.config.elecCostKWH>0)
								strCost = "£" + (Math.round(((intVal * this.config.elecCostKWH)+this.config.elecCostSC) * 100)/100).toFixed(2);

							//display electricity energy usage and cost here
							thiseleclabel.innerHTML = "&nbsp;&nbsp;<span style=\"" + strCol + "\">" + strUse + " " + strCost + "</span>";
							thiseleclabel.style.textAlign = "right";
						}
					}
				}
			}
											
			thisrow.appendChild(thisdatelabel);
			if(this.elecDataRequest) thisrow.appendChild(thiseleclabel);
			
			table.appendChild(thisrow);
			
			dteLoop.setDate(dteLoop.getDate() - 1); //go back to the next day
		}

		wrapper.appendChild(table);		

		return wrapper;
	},

	getHeader: function() {
		var adate = new Date();

		if(this.config.showUpdateTime == true) {
			return this.data.header + " " + adate.toLocaleTimeString();
		} else {
			return this.data.header;
		}
	},

	processElecData: function(data) {
		Log.log("processElecData()");
		var self = this;
		this.elecDataRequest = data;
		this.elecLoaded = true;
		self.updateDom(self.config.animationSpeed);
	},
});
