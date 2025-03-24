<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Location Share</title>
    <!-- Replace 'YOUR_API_KEY' with your actual Google Maps API key -->
    <script async src="https://maps.google.com/maps/api/js?key=AIzaSyCtk-cv518k28_YbwytXpeu3-DAg92mAA4&callback=initMap"></script>

    <style>
        #map {
            height: 400px; /* Set the height of the map */
            width: 100%;   /* Set the width of the map */
        }
    </style>
</head>
<body>
    <h1>Location Share</h1>
    <div id="map"></div>

    <script>
        function initMap() {
            console.log("initMap started");

            // Get session ID from URL params
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get('session');
            if (!sessionId) {
                alert("Please provide a session ID in the URL, e.g., ?session=abc123");
                return;
            }
            console.log("Session ID found: " + sessionId);

            // Prompt for user name
            let userName = prompt("Please enter your name:");
            if (!userName) {
                userName = "Anonymous";
                console.log("No name entered, defaulting to Anonymous");
            } else {
                console.log("User entered name: " + userName);
            }

            // Initialize map centered on a default location
            var map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: 0, lng: 0 },
                zoom: 2
            });
            console.log("Map initialized successfully");

            // Set the map to the user's current location if available
            function setMapToUserLocation() {
                if (navigator.geolocation) {
                    console.log("Requesting user location...");
                    navigator.geolocation.getCurrentPosition(function(position) {
                        var userLat = position.coords.latitude;
                        var userLng = position.coords.longitude;
                        console.log("User location: lat=" + userLat + ", lng=" + userLng);
                        map.setCenter({ lat: userLat, lng: userLng });
                        map.setZoom(15);
                        console.log("Map zoomed to user location");
                    }, function(error) {
                        console.error("Error getting user location:", error);
                    });
                } else {
                    console.log("Geolocation not supported by this browser");
                }
            }

            // Send location data to the backend
            function sendLocation() {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(function(position) {
                        var lat = position.coords.latitude;
                        var lng = position.coords.longitude;
                        console.log("Sending location with name: " + userName);
                        fetch(`https://location-share-backend-rubin-gosaliyas-projects.vercel.app/locations/${sessionId}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ lat, lng, name: userName })
                        })
                        .then(response => response.text())
                        .then(data => console.log("POST response:", data))
                        .catch(error => console.error("POST error:", error));
                    }, function(error) {
                        console.error("Error getting location:", error);
                    });
                } else {
                    alert("Geolocation is not supported by this browser.");
                }
            }

            var markers = [];

            // Update the map with locations from the backend
            function updateMap() {
                fetch(`https://location-share-backend-rubin-gosaliyas-projects.vercel.app/locations/${sessionId}`, {
                    method: 'GET'
                })
                .then(response => response.json())
                .then(data => {
                    // Clear existing markers
                    markers.forEach(marker => marker.setMap(null));
                    markers = [];

                    console.log("Fetched locations:", JSON.stringify(data.locations, null, 2));

                    // Check if the location has a name
                    data.locations.forEach(loc => {
                        console.log("Location data:", loc); // Log individual location object
                        var marker = new google.maps.Marker({
                            position: { lat: loc.lat, lng: loc.lng },
                            map: map,
                            label: loc.name ? loc.name : "Unnamed"  // This should correctly display the name if available
                        });
                        markers.push(marker);
                    });
                })
                .catch(error => console.error("Error fetching locations:", error));
            }

            // Call functions to set location, send, and update map
            setMapToUserLocation();
            sendLocation();
            updateMap();

            // Update every 5 seconds
            setInterval(sendLocation, 5000);
            setInterval(updateMap, 5000);
        }
    </script>
</body>
</html>

