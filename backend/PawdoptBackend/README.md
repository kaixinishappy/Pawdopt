# PawdoptBackend
NOTE: This code does not work as important data is replaced with placeholders!

Pawdopt is a Tinder-style dog adoption app. We aim to encourage adoptions by helping more shelters get noticed, and make it simpler for adopters to find them

Main Features:
Adopters swipe RIGHT for dogs they are interested in, and LEFT for uninterested dogs.
Upon swiping, a chat request between the adopter and the shelter rehoming the dog is created.
Shelters accept or reject such requests to allow chatbox with potential adopters.
A dashboard is provided for shelters to manage dog profiles and update their status.

This is the backend code for Pawdopt. These are exported from AWS Lambda/AppSync, where the functions are deployed.
The openapi.yml file can be used to generate types and functions for APIs
Important data is replaced with placeholders to prevent access to our API that will use our credit.