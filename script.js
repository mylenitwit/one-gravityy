const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const rocketSound = document.getElementById('rocketSound');
const boosterSound = document.getElementById('boosterSound');
const landingLegsSound = document.getElementById('landingLegsSound');
const wyd = document.getElementById('wyd');
rocketSound.loop = true;
boosterSound.loop = true;

document.getElementById('startButton').addEventListener('click', function () {
	const backgroundMusic = document.getElementById('backgroundMusic');
	backgroundMusic.volume = 0.07;
	backgroundMusic.loop = true;
	backgroundMusic.play();
});

let level = 1;
const maxLevel = 10;
const initialFuel = 1000;

const platform = {
	x: canvas.width / 2 - 50,
	y: canvas.height - 30,
	width: 100,
	height: 10,
};

const rocket = {
	x: canvas.width / 2,
	y: 100,
	width: 15,
	height: 100,
	velocityX: 0,
	velocityY: 0,
	angle: 0,
	angularVelocity: 0,
	angularAcceleration: 0,
	mass: 1000,
	momentOfInertia: 5000,
	dragCoefficient: 0.5,
	area: 10,
	landingLegsDeployed: false,
	landingLegsAngle: 0,
	thrustPower: 0,
	fuel: initialFuel,
	exploded: false,
};

let gravity = 9.81;
let currentWindIntensity = 0;
let currentWindDirection = 0;
let targetWindIntensity = 0;
let targetWindDirection = 0;
const airDensity = 1.225;
let simulationActive = false;
let landingStatus = 'Landing in Progress...';
let rocketAngleDegrees = 0;
let altitudeFeet = 0;
let rocketSpeed = 0;
let angularVelocityDegrees = 0;
let landingProcessed = false;
let score = 0;
let totalScore = 0;

let animationFrameId = null;
const fuelConsumptionRate = 50;

let leftKey = false;
let rightKey = false;
let upKey = false;

const restartButton = document.getElementById('restartButton');
const nextLevelButton = document.getElementById('nextLevelButton');
const message = document.getElementById('message');

const explosionSound = document.getElementById('explosionSound');
const applauseSound = document.getElementById('applauseSound');

const startButton = document.getElementById('startButton');
const gameModal = document.getElementById('gameModal');

startButton.addEventListener('click', () => {
	gameModal.style.display = 'none';
	simulationActive = true;
});

restartButton.addEventListener('click', () => {
	level = 1;
	totalScore = 0;
	restartSimulation();
});

nextLevelButton.addEventListener('click', () => {
	if (level >= maxLevel) {
		message.style.display = 'block';
		message.textContent = 'GAME OVER. CONGRATULATIONS!';
		nextLevelButton.style.display = 'none';
	} else {
		level++;
		restartSimulation();
	}
});

function updateInfo() {
	document.getElementById('gravityValue').textContent = gravity.toFixed(2);
	document.getElementById('windDirection').textContent = currentWindDirection.toFixed(0) + '°';
	document.getElementById('windIntensity').textContent = currentWindIntensity.toFixed(2);
	document.getElementById('rocketAngle').textContent = rocketAngleDegrees.toFixed(2) + '°';
	document.getElementById('landingStatus').textContent = landingStatus;
	document.getElementById('altitude').textContent = altitudeFeet.toFixed(2);
	document.getElementById('velocity').textContent = rocketSpeed.toFixed(2);
	document.getElementById('fuel').textContent = Math.round(rocket.fuel) + ' L';
	document.getElementById('level').textContent = level + "/" + maxLevel;
	document.getElementById('angularVelocity').textContent = angularVelocityDegrees.toFixed(2) + '°/s';
	document.getElementById('totalScore').textContent = totalScore.toFixed(2);
}

function generateEnvironmentalParameters() {
	gravity = 9.7 + Math.random() * 0.5;
	targetWindIntensity = Math.random() * 15;
	targetWindDirection = Math.random() * 360;
}

generateEnvironmentalParameters();
setInterval(generateEnvironmentalParameters, 5000);

function setPlatformPosition() {
	const maxDistance = canvas.width / 2 - platform.width - 50;
	const distance = (level - 1) * (maxDistance / (maxLevel - 1)) * (Math.random() < 0.5 ? -1 : 1);
	platform.x = canvas.width / 2 - platform.width / 2 + distance;
	platform.x = Math.min(Math.max(platform.x, 50), canvas.width - platform.width - 50);
	platform.y = canvas.height - platform.height - 20;
}

window.addEventListener('keydown', function (e) {
	if (e.key === 'ArrowLeft') {
		boosterSound.play();
		leftKey = true;
	}
	if (e.key === 'ArrowRight') {
		boosterSound.play();
		rightKey = true;
	}
	if (e.key === 'ArrowUp' || e.key === ' ') {
		rocketSound.play();
		upKey = true;
	}
	if (e.key === 'L' || e.key == 'l') {
    if (rocket.landingLegsDeployed == false) {
      landingLegsSound.play();
    }
		rocket.landingLegsDeployed = true;
		setTimeout(() => {
			landingLegsSound.pause();
			landingLegsSound.currentTime = 0;
		}, 750);
	}
});

window.addEventListener('keyup', function (e) {
	if (e.key === 'ArrowLeft') {
		boosterSound.pause();
		boosterSound.currentTime = 0;
		leftKey = false;
	}
	if (e.key === 'ArrowRight') {
		boosterSound.pause();
		boosterSound.currentTime = 0;
		rightKey = false;
	}
	if (e.key === 'ArrowUp' || e.key === ' ') {
		upKey = false;
		rocketSound.pause();
		rocketSound.currentTime = 0;
	}
});

function update() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	drawSea();
	if (simulationActive) {
		const deltaTime = 0.016;
		const gravityForce = rocket.mass * gravity;
		const windAdjustmentSpeed = 0.01;
		currentWindIntensity += (targetWindIntensity - currentWindIntensity) * windAdjustmentSpeed;
		let windDirectionDifference = ((targetWindDirection - currentWindDirection + 540) % 360) - 180;
		currentWindDirection += windDirectionDifference * windAdjustmentSpeed;
		const windRad = currentWindDirection * (Math.PI / 180);
		const windForceX = currentWindIntensity * Math.cos(windRad) * level;
		const windForceY = currentWindIntensity * Math.sin(windRad) * level;
		const velocity = Math.sqrt(rocket.velocityX ** 2 + rocket.velocityY ** 2);
		const dragForce = 0.5 * airDensity * velocity ** 2 * rocket.dragCoefficient * rocket.area;
		const dragForceX = dragForce * (rocket.velocityX / velocity) || 0;
		const dragForceY = dragForce * (rocket.velocityY / velocity) || 0;
		const altitudeMeters = canvas.height - (rocket.y + rocket.height / 2) - 45;
    if (landingStatus != 'Successful Landing') {
      altitudeFeet = altitudeMeters;
    }
		rocketSpeed = Math.sqrt(rocket.velocityX ** 2 + rocket.velocityY ** 2);

		if (upKey && rocket.fuel > 0) {
			rocket.thrustPower = 15000;
			rocket.fuel -= fuelConsumptionRate * deltaTime;
			if (rocket.fuel < 0) {
				rocket.fuel = 0;
			}
		} else {
			rocket.thrustPower = 0;
		}
		const thrustForceX = rocket.thrustPower * Math.sin(rocket.angle);
		const thrustForceY = rocket.thrustPower * Math.cos(rocket.angle);
		const netForceX = -dragForceX + windForceX + thrustForceX;
		const netForceY = gravityForce - dragForceY + windForceY - thrustForceY;
		const accelerationX = netForceX / rocket.mass;
		const accelerationY = netForceY / rocket.mass;
		rocket.velocityX += accelerationX * deltaTime;
		rocket.velocityY += accelerationY * deltaTime;
		rocket.x += rocket.velocityX * deltaTime;
		rocket.y += rocket.velocityY * deltaTime;
		const L = rocket.height / 2;
		const windForceMagnitude = Math.sqrt(windForceX ** 2 + windForceY ** 2);
		const windForceAngle = Math.atan2(windForceY, windForceX);
		const angleDifference = windForceAngle - rocket.angle;
		let torqueWind = windForceMagnitude * L * Math.sin(angleDifference);
		const maxTorqueWind = 5000;
		torqueWind = Math.max(Math.min(torqueWind, maxTorqueWind), -maxTorqueWind);
		let torqueControl = 0;
		if (leftKey) {
			torqueControl += -5000;
		}
		if (rightKey) {
			torqueControl += 5000;
		}
		const netTorque = torqueWind + torqueControl;
		rocket.angularAcceleration = netTorque / rocket.momentOfInertia;
		const maxAngularAcceleration = 5;
		rocket.angularAcceleration = Math.max(Math.min(rocket.angularAcceleration, maxAngularAcceleration), -maxAngularAcceleration);
		rocket.angularVelocity += rocket.angularAcceleration * deltaTime;
		const maxAngularVelocity = (250 * Math.PI) / 180;
		rocket.angularVelocity = Math.max(Math.min(rocket.angularVelocity, maxAngularVelocity), -maxAngularVelocity);
		rocket.angle += rocket.angularVelocity * deltaTime;
		rocketAngleDegrees = (rocket.angle * 180) / Math.PI;
    rocketAngleDegrees = ((rocketAngleDegrees + 180) % 360) - 180;
    if (rocketAngleDegrees > 180) {
    rocketAngleDegrees -= 360;
    }

		angularVelocityDegrees = (rocket.angularVelocity * 180) / Math.PI;
		if (Math.abs(angularVelocityDegrees) >= 100 && !rocket.exploded) {
			rocket.exploded = true;
			landingStatus = 'Explosion! The angular velocity is too high.';
			simulationActive = false;
			explosionSound.play();
			setTimeout(() => {
				wyd.play();
			}, 1000);
			restartButton.style.display = 'block';
		}
		if (rocket.landingLegsDeployed) {
			if (rocket.landingLegsAngle < Math.PI / 2) {
				rocket.landingLegsAngle += 0.05;
			} else {
				rocket.landingLegsAngle = Math.PI / 2;
			}
		}
		if (rocket.y - rocket.height / 2 > canvas.height - 20 && !rocket.exploded) {
			rocket.exploded = true;
			landingStatus = 'Explosion! You fell into the sea.';
			simulationActive = false;
			explosionSound.play();
			restartButton.style.display = 'block';
		}
		if (rocket.x - rocket.width / 2 <= 0) {
			rocket.x = rocket.width / 2;
			rocket.velocityX = 0;
		}
		if (rocket.x + rocket.width / 2 >= canvas.width) {
			rocket.x = canvas.width - rocket.width / 2;
			rocket.velocityX = 0;
		}
		if (rocket.y + rocket.height / 2 >= platform.y - platform.height && rocket.y + rocket.height / 2 <= platform.y + platform.height ) {
			if (rocket.x >= platform.x && rocket.x <= platform.x + platform.width) {
				const landingAngle = rocketAngleDegrees;
				const landingSpeed = Math.abs(rocket.velocityY);
				const landingAngularVelocity = Math.abs(angularVelocityDegrees);
				if (!landingProcessed) {
					if (rocket.landingLegsDeployed == true && landingSpeed <= 15 && landingAngle >= -15 && landingAngle <= 15 && landingAngularVelocity <= 25) {
						landingStatus = 'Successful Landing!';
						calculateScore(landingSpeed, landingAngle, landingAngularVelocity, rocket.fuel);
						totalScore += score;
						if (level >= maxLevel) {
							message.style.display = 'block';
							message.textContent = 'GAME OVER. CONGRATULATIONS!';
							simulationActive = false;
						} else {
							nextLevelButton.style.display = 'block';
						}
						applauseSound.play();
						confetti({
							particleCount: 100,
							spread: 70,
							origin: { y: 0.6 },
						});
					} else {
						landingStatus = 'Unsuccessful Landing';
						rocket.exploded = true;
						simulationActive = false;
						explosionSound.play();
						restartButton.style.display = 'block';
						totalScore = 0;
					}
					landingProcessed = true;
				}
			} else {
				if (!landingProcessed) {
					landingStatus = 'Explosion! You fell into the sea.';
					rocket.exploded = true;
					simulationActive = false;
					explosionSound.play();
					restartButton.style.display = 'block';
					totalScore = 0;
					landingProcessed = true;
				}
			}
			rocket.velocityY = 0;
			rocket.velocityX = 0;
			rocket.angularVelocity = 0;
			rocket.angularAcceleration = 0;
		}
	}
	drawPlatform();
	drawRocket();
	updateInfo();
	animationFrameId = requestAnimationFrame(update);
}

function calculateScore(landingSpeed, landingAngle, landingAngularVelocity, remainingFuel) {
	let speedScore = (1 - landingSpeed / 10) * 25;
	let angleScore = (1 - Math.abs(landingAngle) / 5) * 25;
	let angularVelocityScore = (1 - landingAngularVelocity / 15) * 25;
	let fuelScore = (remainingFuel / initialFuel) * 25;
	speedScore = Math.max(0, speedScore);
	angleScore = Math.max(0, angleScore);
	angularVelocityScore = Math.max(0, angularVelocityScore);
	fuelScore = Math.max(0, fuelScore);
	score = speedScore + angleScore + angularVelocityScore + fuelScore;
}

function drawSea() {
    ctx.save();

    const oceanGradient = ctx.createLinearGradient(0, canvas.height - 60, 0, canvas.height);
    oceanGradient.addColorStop(0, '#0b3d91');
    oceanGradient.addColorStop(1, '#001f4d');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

    ctx.restore();
}


function drawPlatform() {
    ctx.save();

    const cornerRadius = 10;

    const platformGradient = ctx.createLinearGradient(0, platform.y, 0, platform.y + platform.height);
    platformGradient.addColorStop(0, '#8B4513'); 
    platformGradient.addColorStop(1, '#5A3A1B'); 
    ctx.fillStyle = platformGradient;

    ctx.beginPath();
    ctx.moveTo(platform.x + cornerRadius, platform.y);
    ctx.lineTo(platform.x + platform.width - cornerRadius, platform.y);
    ctx.quadraticCurveTo(platform.x + platform.width, platform.y, platform.x + platform.width, platform.y + cornerRadius);
    ctx.lineTo(platform.x + platform.width, platform.y + platform.height - cornerRadius);
    ctx.quadraticCurveTo(platform.x + platform.width, platform.y + platform.height, platform.x + platform.width - cornerRadius, platform.y + platform.height);
    ctx.lineTo(platform.x + cornerRadius, platform.y + platform.height);
    ctx.quadraticCurveTo(platform.x, platform.y + platform.height, platform.x, platform.y + platform.height - cornerRadius);
    ctx.lineTo(platform.x, platform.y + cornerRadius);
    ctx.quadraticCurveTo(platform.x, platform.y, platform.x + cornerRadius, platform.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#5A3A1B';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(platform.x, platform.y + platform.height);
    ctx.lineTo(platform.x, canvas.height - 20);
    ctx.moveTo(platform.x + platform.width, platform.y + platform.height);
    ctx.lineTo(platform.x + platform.width, canvas.height - 20);
    ctx.strokeStyle = '#3E2A1A';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#CCCCCC';
    ctx.fillRect(platform.x + 10, platform.y - 10, platform.width - 20, 10);

    ctx.restore();
}


function drawRocket() {
	if (rocket.exploded) {
		drawExplosion();
		return;
	}
	ctx.save();
	ctx.translate(rocket.x, rocket.y);
	ctx.rotate(rocket.angle);
	ctx.fillStyle = '#FFFFFF';
	ctx.fillRect(-rocket.width / 2, -rocket.height / 2, rocket.width, rocket.height);
	ctx.fillStyle = '#000000';
	ctx.fillRect(-rocket.width / 2, rocket.height / 4, rocket.width, rocket.height / 4);
	ctx.beginPath();
	ctx.moveTo(-rocket.width / 2, -rocket.height / 2);
	ctx.lineTo(-rocket.width / 2, -rocket.height / 2 - 30);
	ctx.quadraticCurveTo(0, -rocket.height / 2 - 50, rocket.width / 2, -rocket.height / 2 - 30);
	ctx.lineTo(rocket.width / 2, -rocket.height / 2);
	ctx.closePath();
	ctx.fillStyle = '#FFFFFF';
	ctx.fill();
  
	const logo = new Image();
	logo.src = 'logo-bg.jpg';
	const logoWidth = rocket.width * 1.10;
	const logoHeight = rocket.height;
	ctx.drawImage(logo, -logoWidth / 2, -rocket.height / 2 - 25, logoWidth, logoHeight);

  
	if (rocket.landingLegsDeployed) {
		const legWidth = 5;
		const legLength = 40;
    
		ctx.save();
		ctx.translate(-rocket.width / 4 + 2, rocket.height / 2);
		ctx.rotate(-rocket.landingLegsAngle * 0.8);
		ctx.fillStyle = '#555555';
		ctx.fillRect(0, 0, legWidth * 0.8, legLength * 0.8);
		ctx.restore();
    
    ctx.save();
		ctx.translate(-rocket.width / 4 + 11, rocket.height / 2 - 18);
		ctx.rotate(-rocket.landingLegsAngle * 0.4);
		ctx.fillStyle = '#555555';
		ctx.fillRect(0, 0, legWidth * 0.4, legLength * 0.75);
		ctx.restore();
    
		ctx.save();
		ctx.translate(rocket.width / 4 - 2, rocket.height / 2);
		ctx.rotate(rocket.landingLegsAngle * 0.8);
		ctx.fillStyle = '#555555';
		ctx.fillRect(-legWidth * 0.8, 0, legWidth * 0.8, legLength * 0.8);
		ctx.restore();
      
    ctx.save();
		ctx.translate(rocket.width / 4 - 11, rocket.height / 2 - 18);
		ctx.rotate(rocket.landingLegsAngle * 0.4);
		ctx.fillStyle = '#555555';
		ctx.fillRect(0, 0, legWidth * 0.4, legLength * 0.75);
		ctx.restore();
	}  
  
	ctx.fillStyle = '#CCCCCC';
	ctx.fillRect(-rocket.width / 2 - 10, -rocket.height / 2 + rocket.height / 4, 10, 5);
	ctx.fillRect(rocket.width / 2, -rocket.height / 2 + rocket.height / 4, 10, 5);
	const flameLength = 37;
	const flameWidth = 10;

	if (leftKey) {
		ctx.save();
		ctx.translate(rocket.width / 2 + 5, -rocket.height / 4 + 5);

		const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, flameLength);
		gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
		gradient.addColorStop(0.4, 'rgba(220, 220, 220, 0.3)');
		gradient.addColorStop(1, 'rgba(200, 200, 200, 0)');

		ctx.fillStyle = gradient;
		ctx.beginPath();

		ctx.moveTo(-flameWidth / 4, 0);
		ctx.lineTo(flameWidth / 4, 0);
		ctx.quadraticCurveTo(flameWidth / 2, flameLength / 2, 0, flameLength);
		ctx.quadraticCurveTo(-flameWidth / 2, flameLength / 2, -flameWidth / 4, 0);

		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	if (rightKey) {
		ctx.save();
		ctx.translate(-rocket.width / 2 - 5, -rocket.height / 4 + 5);

		const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, flameLength);
		gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
		gradient.addColorStop(0.4, 'rgba(220, 220, 220, 0.3)');
		gradient.addColorStop(1, 'rgba(200, 200, 200, 0)');

		ctx.fillStyle = gradient;
		ctx.beginPath();

		ctx.moveTo(flameWidth / 4, 0);
		ctx.lineTo(-flameWidth / 4, 0);
		ctx.quadraticCurveTo(-flameWidth / 2, flameLength / 2, 0, flameLength);
		ctx.quadraticCurveTo(flameWidth / 2, flameLength / 2, flameWidth / 4, 0);

		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	if (upKey && rocket.fuel > 0) {
		ctx.save();
		ctx.translate(0, rocket.height / 2);
		const flameHeight = 30 + Math.random() * 10;
		const flameWidth = rocket.width * 0.6;
		const gradient = ctx.createRadialGradient(0, 0, 0, 0, flameHeight, flameHeight);
		gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
		gradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.8)');
		gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.moveTo(-flameWidth / 2, 0);
		ctx.lineTo(0, flameHeight);
		ctx.lineTo(flameWidth / 2, 0);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}
	ctx.restore();
}

function drawExplosion() {
	ctx.save();
	ctx.translate(rocket.x, rocket.y);
	const explosionRadius = 50 + Math.random() * 20;
	const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, explosionRadius);
	gradient.addColorStop(0, 'rgba(255, 165, 0, 1)');
	gradient.addColorStop(0.5, 'rgba(255, 69, 0, 0.8)');
	gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
	ctx.fillStyle = gradient;
	ctx.beginPath();
	ctx.arc(0, 0, explosionRadius, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

function restartSimulation() {
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId);
	}
	rocket.x = canvas.width / 2;
	rocket.y = 100;
	rocket.velocityX = 0;
	rocket.velocityY = 0;
	rocket.angle = 0;
	rocket.angularVelocity = 0;
	rocket.angularAcceleration = 0;
	rocket.landingLegsDeployed = false;
	rocket.landingLegsAngle = 0;
	rocket.thrustPower = 0;
	rocket.exploded = false;
	landingProcessed = false;
	rocket.fuel = initialFuel - (level - 1) * 50;
	if (rocket.fuel <= 0) {
		rocket.fuel = 50;
	}
	currentWindIntensity = targetWindIntensity;
	currentWindDirection = targetWindDirection;
	landingStatus = 'İniş Yapılıyor...';
	score = 0;
	generateEnvironmentalParameters();
	setPlatformPosition();
	restartButton.style.display = 'none';
	nextLevelButton.style.display = 'none';
	message.style.display = 'none';
	simulationActive = true;
	update();
}

window.addEventListener('resize', () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	platform.y = canvas.height - platform.height - 20;
	setPlatformPosition();
	rocket.x = canvas.width / 2;
});

window.onload = function () {
	setPlatformPosition();
	update();
};
