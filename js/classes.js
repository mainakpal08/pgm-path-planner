'use strict'
//ROS message class
class Point{
	x=0;y=0;z=0;
	constructor(x=0, y=0, z=0) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}
class Quartenion{
	x=0;y=0;z=0;w=0;
	constructor(x=0, y=0, z=0, w=1) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
	}
}
class Pose{
	position=new Point();
	orientation=new Quartenion();
	constructor(position=new Point(), orientation=new Quartenion()) {
		this.position = position;
		this.orientation = orientation;
	}
}

//default waypoints are saved in canvas coordinates
class Waypoints{
	waypoints = [];
	radius = 2;
	constructor(waypoints=[]) {
		this.waypoints = waypoints;
	}
	push(pose){
		this.waypoints.push(pose);
	}
	draw(){
		//draw path
		ctx.beginPath();
		for (let i=0;i<this.waypoints.length;i++){
			ctx.lineTo(this.waypoints[i].position.x,this.waypoints[i].position.y);
		}
		ctx.stroke();
		
		//draw points
		ctx.beginPath();
		for (let i=0;i<this.waypoints.length;i++){
			//arc(x, y, radius, startAngle, endAngle, anticlockwise)
			ctx.moveTo(this.waypoints[i].position.x+this.radius, this.waypoints[i].position.y)
			ctx.arc(this.waypoints[i].position.x,
				this.waypoints[i].position.y,
				this.radius, 0, Math.PI * 2, true);
		}
		ctx.fill();
	}
}