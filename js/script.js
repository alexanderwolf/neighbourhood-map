var map;
//search queries for Google Maps Api - uses Places library to return full place infomrmation
var locations = [
    { "query": "Knowles of Norwood SE27 9AF", "type": "bar" }, 
    { "query": "The Railway Tavern SE27 9BW", "type": "bar" },
    { "query": "Pratts and Payne SW16 1HJ", "type": "bar" },
    { "query": "The Bedford SW12 9HD", "type": "bar" }, 
    { "query": "Hagen & Hyde SW12 9AU", "type": "bar" }, 
    { "query": "Crown & Anchor SW9 6AQ", "type": "bar" }, 
    { "query": "The Duke of Edinburgh SW9 8AG", "type": "bar" }, 
    { "query": "The Trinity Arms SW9 8DR", "type": "bar" }, 
    { "query": "Bullfinch Brewery SE24 9EH", "type": "bar" }, 
    { "query": "The Castle SW17 0RG", "type": "bar" }
];

//Locations constructor. Uses Google Maps and OpenWeather APIs to build objects
var Location = function(data) {
    
    var self = this;
    this.name = data.name;
    this.formattedAddress = data.formatted_address; 
    this.openNow = (data.opening_hours.open_now == true ? "OPEN NOW" : "");
    this.rating = typeof data.rating !== undefined ? data.rating : "";
    this.lat = data.geometry.location.lat();
    this.lng = data.geometry.location.lng();
    this.visible = ko.observable(true);
    this.photo = typeof data.photos !== 'undefined' ? data.photos[0].getUrl({'maxWidth': 200, 'maxHeight': 200}) : '';
    this.weather = data.weather;

    this.marker = new google.maps.Marker({
        position: new google.maps.LatLng(data.geometry.location.lat, data.geometry.location.lng),
        map: map,
        place: {
            placeId: data.place_id,
            location: data.geometry.location
        },
        animation: google.maps.Animation.DROP,       
        title: data.name,
        photo: self.photo 
    });

    this.showMarker = ko.computed(function() {
        if(this.visible() === true) {
            this.marker.setMap(map);
        } else {
            this.marker.setMap(null);
        }
        return true;
    }, this);    

    this.contentString =    '<div class="info-window-content">' +
                                '<div class="title"><b>' + this.name + '</b></div>' +
                                '<div class="address">' + this.formattedAddress + '</div>' +
                                '<div class="rating"> Rating: ' + this.rating + '</div>' +
                                '<div class="openNow" style="color:green">' + this.openNow + '</div>' +
                                '<div class="weather"> Weather here: ' + this.weather + '</div>' +
                                '<div class="photo"><img src="' + this.photo + '"></div>' +
                                '<div class="attribution" style="color:#b8b9ba">(source: Google Maps and OpenWeather APIs)</div>'
                            '</div>';

    this.infoWindow = new google.maps.InfoWindow({content: self.contentString});
    this.infoWindow.visible = ko.observable(false);
    this.infoWindow.setContent(self.contentString);

    this.openInfoWindow = function() {
        self.infoWindow.open(map, self.marker);
        self.marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            self.marker.setAnimation(null);
        }, 2100);
    };   

    this.marker.addListener('click', function() {         
        self.openInfoWindow();
    }); 

};

function AppViewModel() {

    //new instance of Google Map
    var mapOptions = {
        zoom: 14,
        center: new google.maps.LatLng(51.4415460,-0.1248070),
        mapTypeControl: false
    }; 
    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    var self = this;
    var bounds = new google.maps.LatLngBounds();

    //callback function for Google Maps API calls. On success, then gets weather data based on returned Place location then builds Objects 
    //by calling Location constructor class
    function callback(results, status) {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
            var lat = results[0].geometry.location.lat();
            var lng = results[0].geometry.location.lng()
            var openWeatherUrl = "http://api.openweathermap.org/data/2.5/weather?lat="+lat+"&lon="+lng+"&APPID=4c4bbbfe912eef49997161d8f4176696";
            $.getJSON(openWeatherUrl).done(function(weather) {
                results[0].weather = weather.weather[0].main;
                self.locations.push( new Location(results[0]));
            });                     
        }
    }

    this.searchTerm = ko.observable("");
    this.locations = ko.observableArray([]);    
    
    //Google Maps API calls. Looks up bars within 5km of my house, that match query terms
    locations.forEach(function(location) {
        var request = {
            location: {lat: 51.4373600, lng: -0.1190500},
            radius: '5000',
            query: location.query,
            type: location.type
        };
        var service = new google.maps.places.PlacesService(map);
        service.textSearch(request, callback);           
    });
        
    //Knockout JS filtered list observable
    this.filteredList = ko.computed(function() {
        var filter = self.searchTerm().toLowerCase();
        if(!filter) { 
            self.locations().forEach(function(location){
                location.visible(true);
            }); 
        return self.locations();
        } else {
            return ko.utils.arrayFilter(self.locations(), function(location) {
                var string = location.name.toLowerCase();
                var result = (string.search(filter) >= 0);
                location.visible(result);                
                return result;
            });
        } 
    }, self);

    //focuses on search box on page load
    $("input:text:visible:first").focus();

}

function startApp() { 
    ko.applyBindings(new AppViewModel());
}

function errorHandling() {
    alert("Google Maps failed to load. Check your connection and try again");
}
